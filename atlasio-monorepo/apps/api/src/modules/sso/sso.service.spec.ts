import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SsoService } from './sso.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const makeRedis = () => ({
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
});

const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

const makeJwt = () => ({
  signAsync: jest.fn().mockResolvedValue('mock_sso_token'),
});

const makePrisma = (overrides: any = {}) => ({
  ssoProvider: {
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides.ssoProvider,
  },
  userSsoLink: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    ...overrides.userSsoLink,
  },
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides.user,
  },
});

function buildService(prismaOv: any = {}, jwtOv: any = {}, redisOv: any = {}) {
  const prisma = makePrisma(prismaOv) as unknown as PrismaService;
  const jwt = { ...makeJwt(), ...jwtOv } as unknown as JwtService;
  const audit = makeAudit() as unknown as AuditService;
  const redis = { ...makeRedis(), ...redisOv } as any;
  return { service: new SsoService(prisma, jwt, audit, redis), prisma, jwt, audit, redis };
}

const mockProvider = {
  id: 'prov-1',
  tenantId: 'tenant-1',
  name: 'Okta',
  protocol: 'OIDC',
  issuer: 'https://okta.example.com',
  clientId: 'client-123',
  clientSecret: 'secret-456',
  discoveryUrl: 'https://okta.example.com/.well-known/openid-configuration',
  callbackUrl: 'http://localhost:4000/sso/oidc/callback',
  scopes: 'openid profile email',
  autoProvision: true,
  defaultRole: 'STUDENT',
  enabled: true,
};

// ─── Provider CRUD ───────────────────────────────────────────────────────────

describe('SsoService.createProvider', () => {
  it('SSO provider oluşturur', async () => {
    const { service, prisma } = buildService();
    (prisma.ssoProvider.create as jest.Mock).mockResolvedValue(mockProvider);

    const result = await service.createProvider('tenant-1', {
      name: 'Okta', protocol: 'OIDC', issuer: 'https://okta.example.com',
      clientId: 'client-123', discoveryUrl: 'https://okta.example.com/.well-known/openid-configuration',
    });

    expect(prisma.ssoProvider.create).toHaveBeenCalledTimes(1);
    expect(result.name).toBe('Okta');
  });
});

describe('SsoService.listProviders', () => {
  it('tenant için aktif providerları listeler', async () => {
    const { service, prisma } = buildService();
    (prisma.ssoProvider.findMany as jest.Mock).mockResolvedValue([mockProvider]);

    const result = await service.listProviders('tenant-1');
    expect(result).toHaveLength(1);
  });
});

describe('SsoService.getProvider', () => {
  it('bulunamazsa NotFoundException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.ssoProvider.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.getProvider('nonexistent', 'tenant-1'))
      .rejects.toThrow(NotFoundException);
  });

  it('var olan provider döner', async () => {
    const { service, prisma } = buildService();
    (prisma.ssoProvider.findFirst as jest.Mock).mockResolvedValue(mockProvider);

    const result = await service.getProvider('prov-1', 'tenant-1');
    expect(result.id).toBe('prov-1');
  });
});

describe('SsoService.deleteProvider', () => {
  it('bulunamazsa NotFoundException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.ssoProvider.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.deleteProvider('nonexistent', 'tenant-1'))
      .rejects.toThrow(NotFoundException);
  });
});

// ─── OIDC Flow ───────────────────────────────────────────────────────────────

describe('SsoService.initiateOidc', () => {
  it('SAML2 provider ile çağrılırsa BadRequestException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.ssoProvider.findFirst as jest.Mock).mockResolvedValue({ ...mockProvider, protocol: 'SAML2' });

    await expect(service.initiateOidc('prov-1', 'tenant-1'))
      .rejects.toThrow(BadRequestException);
  });
});

// ─── SAML2 Flow ──────────────────────────────────────────────────────────────

describe('SsoService.initiateSaml', () => {
  it('OIDC provider ile çağrılırsa BadRequestException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.ssoProvider.findFirst as jest.Mock).mockResolvedValue({ ...mockProvider, protocol: 'OIDC' });

    await expect(service.initiateSaml('prov-1', 'tenant-1'))
      .rejects.toThrow(BadRequestException);
  });
});

// ─── SAML Callback ───────────────────────────────────────────────────────────

describe('SsoService.handleSamlCallback', () => {
  it('RelayState yoksa BadRequestException fırlatır', async () => {
    const samlResponse = Buffer.from('<xml></xml>').toString('base64');
    const { service } = buildService();

    await expect(service.handleSamlCallback(samlResponse))
      .rejects.toThrow(BadRequestException);
  });
});

// ─── User SSO Links ──────────────────────────────────────────────────────────

describe('SsoService.getUserSsoLinks', () => {
  it('kullanıcı SSO bağlantılarını döner', async () => {
    const { service, prisma } = buildService();
    (prisma.userSsoLink.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getUserSsoLinks('user-1');
    expect(result).toEqual([]);
  });
});

describe('SsoService.unlinkSso', () => {
  it('bağlantı bulunamazsa NotFoundException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.userSsoLink.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.unlinkSso('user-1', 'link-1'))
      .rejects.toThrow(NotFoundException);
  });
});
