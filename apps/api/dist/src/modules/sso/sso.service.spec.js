"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const sso_service_1 = require("./sso.service");
const makeRedis = () => ({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
});
const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });
const makeJwt = () => ({
    signAsync: jest.fn().mockResolvedValue('mock_sso_token'),
});
const makePrisma = (overrides = {}) => ({
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
function buildService(prismaOv = {}, jwtOv = {}, redisOv = {}) {
    const prisma = makePrisma(prismaOv);
    const jwt = { ...makeJwt(), ...jwtOv };
    const audit = makeAudit();
    const redis = { ...makeRedis(), ...redisOv };
    return { service: new sso_service_1.SsoService(prisma, jwt, audit, redis), prisma, jwt, audit, redis };
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
describe('SsoService.createProvider', () => {
    it('SSO provider oluşturur', async () => {
        const { service, prisma } = buildService();
        prisma.ssoProvider.create.mockResolvedValue(mockProvider);
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
        prisma.ssoProvider.findMany.mockResolvedValue([mockProvider]);
        const result = await service.listProviders('tenant-1');
        expect(result).toHaveLength(1);
    });
});
describe('SsoService.getProvider', () => {
    it('bulunamazsa NotFoundException fırlatır', async () => {
        const { service, prisma } = buildService();
        prisma.ssoProvider.findFirst.mockResolvedValue(null);
        await expect(service.getProvider('nonexistent', 'tenant-1'))
            .rejects.toThrow(common_1.NotFoundException);
    });
    it('var olan provider döner', async () => {
        const { service, prisma } = buildService();
        prisma.ssoProvider.findFirst.mockResolvedValue(mockProvider);
        const result = await service.getProvider('prov-1', 'tenant-1');
        expect(result.id).toBe('prov-1');
    });
});
describe('SsoService.deleteProvider', () => {
    it('bulunamazsa NotFoundException fırlatır', async () => {
        const { service, prisma } = buildService();
        prisma.ssoProvider.findFirst.mockResolvedValue(null);
        await expect(service.deleteProvider('nonexistent', 'tenant-1'))
            .rejects.toThrow(common_1.NotFoundException);
    });
});
describe('SsoService.initiateOidc', () => {
    it('SAML2 provider ile çağrılırsa BadRequestException fırlatır', async () => {
        const { service, prisma } = buildService();
        prisma.ssoProvider.findFirst.mockResolvedValue({ ...mockProvider, protocol: 'SAML2' });
        await expect(service.initiateOidc('prov-1', 'tenant-1'))
            .rejects.toThrow(common_1.BadRequestException);
    });
});
describe('SsoService.initiateSaml', () => {
    it('OIDC provider ile çağrılırsa BadRequestException fırlatır', async () => {
        const { service, prisma } = buildService();
        prisma.ssoProvider.findFirst.mockResolvedValue({ ...mockProvider, protocol: 'OIDC' });
        await expect(service.initiateSaml('prov-1', 'tenant-1'))
            .rejects.toThrow(common_1.BadRequestException);
    });
});
describe('SsoService.handleSamlCallback', () => {
    it('RelayState yoksa BadRequestException fırlatır', async () => {
        const samlResponse = Buffer.from('<xml></xml>').toString('base64');
        const { service } = buildService();
        await expect(service.handleSamlCallback(samlResponse))
            .rejects.toThrow(common_1.BadRequestException);
    });
});
describe('SsoService.getUserSsoLinks', () => {
    it('kullanıcı SSO bağlantılarını döner', async () => {
        const { service, prisma } = buildService();
        prisma.userSsoLink.findMany.mockResolvedValue([]);
        const result = await service.getUserSsoLinks('user-1');
        expect(result).toEqual([]);
    });
});
describe('SsoService.unlinkSso', () => {
    it('bağlantı bulunamazsa NotFoundException fırlatır', async () => {
        const { service, prisma } = buildService();
        prisma.userSsoLink.findFirst.mockResolvedValue(null);
        await expect(service.unlinkSso('user-1', 'link-1'))
            .rejects.toThrow(common_1.NotFoundException);
    });
});
//# sourceMappingURL=sso.service.spec.js.map