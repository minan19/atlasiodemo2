import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { REDIS } from '../../infra/redis/redis.provider';

/**
 * SSO Service: Manages SSO providers (SAML2/OIDC) and handles
 * authentication flows for enterprise identity providers.
 *
 * Flow:
 *  1. Admin creates SsoProvider for tenant (SAML or OIDC config)
 *  2. User clicks "Login with SSO" → redirect to IdP
 *  3. IdP authenticates → callback with assertion/token
 *  4. Service validates, finds/creates user, issues JWT
 */
@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // ─── Provider CRUD ─────────────────────────────────────────────────────────

  async createProvider(tenantId: string, data: {
    name: string;
    protocol: 'SAML2' | 'OIDC';
    issuer: string;
    clientId?: string;
    clientSecret?: string;
    discoveryUrl?: string;
    metadataXml?: string;
    certificate?: string;
    callbackUrl?: string;
    acsUrl?: string;
    scopes?: string;
    attributeMap?: Record<string, string>;
    autoProvision?: boolean;
    defaultRole?: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  }) {
    const provider = await this.prisma.ssoProvider.create({
      data: {
        tenantId,
        name: data.name,
        protocol: data.protocol,
        issuer: data.issuer,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        discoveryUrl: data.discoveryUrl,
        metadataXml: data.metadataXml,
        certificate: data.certificate,
        callbackUrl: data.callbackUrl,
        acsUrl: data.acsUrl,
        scopes: data.scopes ?? 'openid profile email',
        attributeMap: data.attributeMap ?? {},
        autoProvision: data.autoProvision ?? true,
        defaultRole: data.defaultRole ?? 'STUDENT',
      },
    });
    this.logger.log(`SSO Provider created: ${provider.name} (${provider.protocol}) for tenant ${tenantId}`);
    return provider;
  }

  async listProviders(tenantId: string) {
    return this.prisma.ssoProvider.findMany({
      where: { tenantId, enabled: true },
      select: {
        id: true,
        name: true,
        protocol: true,
        issuer: true,
        enabled: true,
        autoProvision: true,
        defaultRole: true,
        createdAt: true,
      },
    });
  }

  async getProvider(providerId: string, tenantId: string) {
    const provider = await this.prisma.ssoProvider.findFirst({
      where: { id: providerId, tenantId },
    });
    if (!provider) throw new NotFoundException('SSO provider not found');
    return provider;
  }

  async updateProvider(providerId: string, tenantId: string, data: Partial<{
    name: string;
    clientId: string;
    clientSecret: string;
    discoveryUrl: string;
    metadataXml: string;
    certificate: string;
    callbackUrl: string;
    acsUrl: string;
    scopes: string;
    attributeMap: Record<string, string>;
    autoProvision: boolean;
    defaultRole: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
    enabled: boolean;
  }>) {
    const provider = await this.prisma.ssoProvider.findFirst({ where: { id: providerId, tenantId } });
    if (!provider) throw new NotFoundException('SSO provider not found');
    return this.prisma.ssoProvider.update({
      where: { id: providerId },
      data,
    });
  }

  async deleteProvider(providerId: string, tenantId: string) {
    const provider = await this.prisma.ssoProvider.findFirst({ where: { id: providerId, tenantId } });
    if (!provider) throw new NotFoundException('SSO provider not found');
    await this.prisma.ssoProvider.delete({ where: { id: providerId } });
    return { deleted: true };
  }

  // ─── OIDC Flow ─────────────────────────────────────────────────────────────

  /**
   * Generate OIDC authorization URL for redirect.
   * Stores state in Redis for CSRF protection.
   */
  async initiateOidc(providerId: string, tenantId: string) {
    const provider = await this.getProvider(providerId, tenantId);
    if (provider.protocol !== 'OIDC') throw new BadRequestException('Provider is not OIDC');
    if (!provider.discoveryUrl || !provider.clientId) {
      throw new BadRequestException('OIDC provider missing discoveryUrl or clientId');
    }

    const state = randomUUID();
    const nonce = randomUUID();

    // Store state in Redis (5 min TTL) for CSRF validation
    await this.redis.set(`sso:state:${state}`, JSON.stringify({
      providerId,
      tenantId,
      nonce,
    }), 'EX', 300);

    // Build authorization URL from discovery
    const discoveryResponse = await fetch(provider.discoveryUrl);
    const discovery = await discoveryResponse.json() as { authorization_endpoint?: string };
    const authEndpoint = discovery.authorization_endpoint;
    if (!authEndpoint) throw new BadRequestException('Discovery document missing authorization_endpoint');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: provider.clientId,
      redirect_uri: provider.callbackUrl ?? `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/sso/oidc/callback`,
      scope: provider.scopes ?? 'openid profile email',
      state,
      nonce,
    });

    return { url: `${authEndpoint}?${params.toString()}`, state };
  }

  /**
   * Handle OIDC callback: exchange code for tokens, validate, upsert user.
   */
  async handleOidcCallback(code: string, state: string) {
    // Validate state from Redis
    const stateData = await this.redis.get(`sso:state:${state}`);
    if (!stateData) throw new BadRequestException('Invalid or expired SSO state');
    await this.redis.del(`sso:state:${state}`);

    const { providerId, tenantId, nonce } = JSON.parse(stateData);
    const provider = await this.getProvider(providerId, tenantId);

    // Fetch discovery document for token endpoint
    const discoveryResponse = await fetch(provider.discoveryUrl!);
    const discovery = await discoveryResponse.json() as { token_endpoint?: string; userinfo_endpoint?: string };

    // Exchange code for tokens
    const tokenResponse = await fetch(discovery.token_endpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: provider.clientId!,
        client_secret: provider.clientSecret ?? '',
        redirect_uri: provider.callbackUrl ?? `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/sso/oidc/callback`,
      }),
    });
    const tokens = await tokenResponse.json() as { access_token?: string; id_token?: string };
    if (!tokens.access_token) throw new BadRequestException('Failed to obtain access token');

    // Fetch user info
    const userInfoResponse = await fetch(discovery.userinfo_endpoint!, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json() as {
      sub?: string;
      email?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
    };

    if (!userInfo.sub || !userInfo.email) {
      throw new BadRequestException('IdP did not return required user info (sub, email)');
    }

    return this.findOrCreateUser({
      providerId,
      tenantId,
      externalId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      firstName: userInfo.given_name,
      lastName: userInfo.family_name,
      autoProvision: provider.autoProvision,
      defaultRole: provider.defaultRole,
    });
  }

  // ─── SAML2 Flow ────────────────────────────────────────────────────────────

  /**
   * Generate SAML2 AuthnRequest redirect URL.
   */
  async initiateSaml(providerId: string, tenantId: string) {
    const provider = await this.getProvider(providerId, tenantId);
    if (provider.protocol !== 'SAML2') throw new BadRequestException('Provider is not SAML2');

    const requestId = `_${randomUUID()}`;
    const issueInstant = new Date().toISOString();
    const acsUrl = provider.acsUrl ?? `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/sso/saml/acs`;

    // Build minimal SAML AuthnRequest
    const authnRequest = `<samlp:AuthnRequest
      xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
      ID="${requestId}"
      Version="2.0"
      IssueInstant="${issueInstant}"
      AssertionConsumerServiceURL="${acsUrl}"
      Destination="${provider.issuer}">
      <saml:Issuer>${process.env.SAML_ENTITY_ID ?? 'urn:atlasio:sp'}</saml:Issuer>
    </samlp:AuthnRequest>`;

    // Store request ID in Redis for replay protection
    await this.redis.set(`sso:saml:${requestId}`, JSON.stringify({
      providerId,
      tenantId,
    }), 'EX', 300);

    // Encode and build redirect URL
    const encoded = Buffer.from(authnRequest).toString('base64');
    const ssoUrl = provider.issuer; // SSO redirect endpoint (typically from metadata)
    const params = new URLSearchParams({
      SAMLRequest: encoded,
      RelayState: JSON.stringify({ providerId, tenantId }),
    });

    return { url: `${ssoUrl}?${params.toString()}`, requestId };
  }

  /**
   * Handle SAML2 Assertion Consumer Service (ACS) callback.
   * In production, use passport-saml for full XML signature validation.
   */
  async handleSamlCallback(samlResponse: string, relayState?: string) {
    // Decode SAML response (base64)
    const xml = Buffer.from(samlResponse, 'base64').toString('utf-8');

    // Parse RelayState to get provider info
    let providerId: string;
    let tenantId: string;

    if (relayState) {
      const parsed = JSON.parse(relayState);
      providerId = parsed.providerId;
      tenantId = parsed.tenantId;
    } else {
      throw new BadRequestException('Missing RelayState in SAML response');
    }

    const provider = await this.getProvider(providerId, tenantId);

    // Basic SAML assertion parsing (production: use xml-crypto / passport-saml)
    const nameIdMatch = xml.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
    const emailMatch = xml.match(/Name="email"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);
    const nameMatch = xml.match(/Name="displayName"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);
    const firstNameMatch = xml.match(/Name="firstName"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);
    const lastNameMatch = xml.match(/Name="lastName"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);

    const externalId = nameIdMatch?.[1];
    const email = emailMatch?.[1];

    if (!externalId) throw new BadRequestException('SAML assertion missing NameID');
    if (!email) throw new BadRequestException('SAML assertion missing email attribute');

    return this.findOrCreateUser({
      providerId,
      tenantId,
      externalId,
      email,
      name: nameMatch?.[1],
      firstName: firstNameMatch?.[1],
      lastName: lastNameMatch?.[1],
      autoProvision: provider.autoProvision,
      defaultRole: provider.defaultRole,
    });
  }

  // ─── User Resolution ──────────────────────────────────────────────────────

  /**
   * Find existing user by SSO link or email, or create new user if auto-provision enabled.
   * Returns JWT token pair.
   */
  private async findOrCreateUser(params: {
    providerId: string;
    tenantId: string;
    externalId: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    autoProvision: boolean;
    defaultRole: string;
  }) {
    const { providerId, tenantId, externalId, email, name, firstName, lastName, autoProvision, defaultRole } = params;

    // 1. Check existing SSO link
    const ssoLink = await this.prisma.userSsoLink.findUnique({
      where: { providerId_externalId: { providerId, externalId } },
      include: { User: true },
    });

    let user = ssoLink?.User;

    if (!user) {
      // 2. Check if user exists with same email in this tenant
      user = await this.prisma.user.findFirst({
        where: { email, tenantId },
      }) ?? undefined;

      if (!user && autoProvision) {
        // 3. Auto-provision new user
        user = await this.prisma.user.create({
          data: {
            email,
            passwordHash: '', // No password for SSO users
            name: name ?? (`${firstName ?? ''} ${lastName ?? ''}`.trim() || email.split('@')[0]),
            firstName,
            lastName,
            role: defaultRole as any,
            tenantId,
            emailVerified: true, // SSO users are pre-verified
          },
        });
        this.logger.log(`SSO auto-provisioned user: ${email} in tenant ${tenantId}`);
      }

      if (!user) {
        throw new BadRequestException(
          'No matching user found and auto-provisioning is disabled. Contact your admin.',
        );
      }

      // Create SSO link
      await this.prisma.userSsoLink.create({
        data: {
          userId: user.id,
          providerId,
          externalId,
          externalEmail: email,
          metadata: { name, firstName, lastName },
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Update last login
      await this.prisma.userSsoLink.update({
        where: { id: ssoLink!.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // Update user last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Issue JWT token pair
    const jti = randomUUID();
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, email: user.email, tenantId: user.tenantId },
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, type: 'refresh', jti },
      { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
    );
    await this.redis.set(`rt:${jti}`, user.id, 'EX', 7 * 24 * 60 * 60);

    await this.audit.log({
      actorId: user.id,
      action: 'auth.sso_login',
      entity: 'User',
      entityId: user.id,
      meta: { providerId, protocol: 'SSO', externalId },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  // ─── User SSO Links ───────────────────────────────────────────────────────

  async getUserSsoLinks(userId: string) {
    return this.prisma.userSsoLink.findMany({
      where: { userId },
      include: { SsoProvider: { select: { id: true, name: true, protocol: true } } },
    });
  }

  async unlinkSso(userId: string, linkId: string) {
    const link = await this.prisma.userSsoLink.findFirst({
      where: { id: linkId, userId },
    });
    if (!link) throw new NotFoundException('SSO link not found');
    await this.prisma.userSsoLink.delete({ where: { id: linkId } });
    return { unlinked: true };
  }
}
