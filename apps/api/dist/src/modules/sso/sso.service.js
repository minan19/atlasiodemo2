"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SsoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SsoService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const redis_provider_1 = require("../../infra/redis/redis.provider");
let SsoService = SsoService_1 = class SsoService {
    constructor(prisma, jwt, audit, redis) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.audit = audit;
        this.redis = redis;
        this.logger = new common_1.Logger(SsoService_1.name);
    }
    async createProvider(tenantId, data) {
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
    async listProviders(tenantId) {
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
    async getProvider(providerId, tenantId) {
        const provider = await this.prisma.ssoProvider.findFirst({
            where: { id: providerId, tenantId },
        });
        if (!provider)
            throw new common_1.NotFoundException('SSO provider not found');
        return provider;
    }
    async updateProvider(providerId, tenantId, data) {
        const provider = await this.prisma.ssoProvider.findFirst({ where: { id: providerId, tenantId } });
        if (!provider)
            throw new common_1.NotFoundException('SSO provider not found');
        return this.prisma.ssoProvider.update({
            where: { id: providerId },
            data,
        });
    }
    async deleteProvider(providerId, tenantId) {
        const provider = await this.prisma.ssoProvider.findFirst({ where: { id: providerId, tenantId } });
        if (!provider)
            throw new common_1.NotFoundException('SSO provider not found');
        await this.prisma.ssoProvider.delete({ where: { id: providerId } });
        return { deleted: true };
    }
    async initiateOidc(providerId, tenantId) {
        const provider = await this.getProvider(providerId, tenantId);
        if (provider.protocol !== 'OIDC')
            throw new common_1.BadRequestException('Provider is not OIDC');
        if (!provider.discoveryUrl || !provider.clientId) {
            throw new common_1.BadRequestException('OIDC provider missing discoveryUrl or clientId');
        }
        const state = (0, crypto_1.randomUUID)();
        const nonce = (0, crypto_1.randomUUID)();
        await this.redis.set(`sso:state:${state}`, JSON.stringify({
            providerId,
            tenantId,
            nonce,
        }), 'EX', 300);
        const discoveryResponse = await fetch(provider.discoveryUrl);
        const discovery = await discoveryResponse.json();
        const authEndpoint = discovery.authorization_endpoint;
        if (!authEndpoint)
            throw new common_1.BadRequestException('Discovery document missing authorization_endpoint');
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
    async handleOidcCallback(code, state) {
        const stateData = await this.redis.get(`sso:state:${state}`);
        if (!stateData)
            throw new common_1.BadRequestException('Invalid or expired SSO state');
        await this.redis.del(`sso:state:${state}`);
        const { providerId, tenantId, nonce } = JSON.parse(stateData);
        const provider = await this.getProvider(providerId, tenantId);
        const discoveryResponse = await fetch(provider.discoveryUrl);
        const discovery = await discoveryResponse.json();
        const tokenResponse = await fetch(discovery.token_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: provider.clientId,
                client_secret: provider.clientSecret ?? '',
                redirect_uri: provider.callbackUrl ?? `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/sso/oidc/callback`,
            }),
        });
        const tokens = await tokenResponse.json();
        if (!tokens.access_token)
            throw new common_1.BadRequestException('Failed to obtain access token');
        const userInfoResponse = await fetch(discovery.userinfo_endpoint, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const userInfo = await userInfoResponse.json();
        if (!userInfo.sub || !userInfo.email) {
            throw new common_1.BadRequestException('IdP did not return required user info (sub, email)');
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
    async initiateSaml(providerId, tenantId) {
        const provider = await this.getProvider(providerId, tenantId);
        if (provider.protocol !== 'SAML2')
            throw new common_1.BadRequestException('Provider is not SAML2');
        const requestId = `_${(0, crypto_1.randomUUID)()}`;
        const issueInstant = new Date().toISOString();
        const acsUrl = provider.acsUrl ?? `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/sso/saml/acs`;
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
        await this.redis.set(`sso:saml:${requestId}`, JSON.stringify({
            providerId,
            tenantId,
        }), 'EX', 300);
        const encoded = Buffer.from(authnRequest).toString('base64');
        const ssoUrl = provider.issuer;
        const params = new URLSearchParams({
            SAMLRequest: encoded,
            RelayState: JSON.stringify({ providerId, tenantId }),
        });
        return { url: `${ssoUrl}?${params.toString()}`, requestId };
    }
    async handleSamlCallback(samlResponse, relayState) {
        const xml = Buffer.from(samlResponse, 'base64').toString('utf-8');
        let providerId;
        let tenantId;
        if (relayState) {
            const parsed = JSON.parse(relayState);
            providerId = parsed.providerId;
            tenantId = parsed.tenantId;
        }
        else {
            throw new common_1.BadRequestException('Missing RelayState in SAML response');
        }
        const provider = await this.getProvider(providerId, tenantId);
        const nameIdMatch = xml.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
        const emailMatch = xml.match(/Name="email"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);
        const nameMatch = xml.match(/Name="displayName"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);
        const firstNameMatch = xml.match(/Name="firstName"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);
        const lastNameMatch = xml.match(/Name="lastName"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);
        const externalId = nameIdMatch?.[1];
        const email = emailMatch?.[1];
        if (!externalId)
            throw new common_1.BadRequestException('SAML assertion missing NameID');
        if (!email)
            throw new common_1.BadRequestException('SAML assertion missing email attribute');
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
    async findOrCreateUser(params) {
        const { providerId, tenantId, externalId, email, name, firstName, lastName, autoProvision, defaultRole } = params;
        const ssoLink = await this.prisma.userSsoLink.findUnique({
            where: { providerId_externalId: { providerId, externalId } },
            include: { User: true },
        });
        let user = ssoLink?.User;
        if (!user) {
            user = await this.prisma.user.findFirst({
                where: { email, tenantId },
            }) ?? undefined;
            if (!user && autoProvision) {
                user = await this.prisma.user.create({
                    data: {
                        email,
                        passwordHash: '',
                        name: name ?? (`${firstName ?? ''} ${lastName ?? ''}`.trim() || email.split('@')[0]),
                        firstName,
                        lastName,
                        role: defaultRole,
                        tenantId,
                        emailVerified: true,
                    },
                });
                this.logger.log(`SSO auto-provisioned user: ${email} in tenant ${tenantId}`);
            }
            if (!user) {
                throw new common_1.BadRequestException('No matching user found and auto-provisioning is disabled. Contact your admin.');
            }
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
        }
        else {
            await this.prisma.userSsoLink.update({
                where: { id: ssoLink.id },
                data: { lastLoginAt: new Date() },
            });
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        const jti = (0, crypto_1.randomUUID)();
        const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role, email: user.email, tenantId: user.tenantId }, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
        const refreshToken = await this.jwt.signAsync({ sub: user.id, type: 'refresh', jti }, { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
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
    async getUserSsoLinks(userId) {
        return this.prisma.userSsoLink.findMany({
            where: { userId },
            include: { SsoProvider: { select: { id: true, name: true, protocol: true } } },
        });
    }
    async unlinkSso(userId, linkId) {
        const link = await this.prisma.userSsoLink.findFirst({
            where: { id: linkId, userId },
        });
        if (!link)
            throw new common_1.NotFoundException('SSO link not found');
        await this.prisma.userSsoLink.delete({ where: { id: linkId } });
        return { unlinked: true };
    }
};
exports.SsoService = SsoService;
exports.SsoService = SsoService = SsoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(redis_provider_1.REDIS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        audit_service_1.AuditService, Function])
], SsoService);
//# sourceMappingURL=sso.service.js.map