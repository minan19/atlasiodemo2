import { BadRequestException, HttpException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as argon2 from 'argon2';

// argon2 mock — testlerde gerçek hash hesaplaması gereksiz
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  verify: jest.fn().mockResolvedValue(true),
}));

const makeRedis = () => ({
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
});

const makePrisma = (overrides: Partial<any> = {}) => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides.user,
  },
});

const makeJwt = () => ({
  signAsync: jest.fn().mockResolvedValue('mock_token'),
  verifyAsync: jest.fn(),
});

const makeAudit = () => ({
  log: jest.fn().mockResolvedValue(undefined),
});

const makeNotifications = () => ({
  sendAdminAlert: jest.fn().mockResolvedValue({ sent: false, reason: 'smtp_not_configured' }),
  sendUserEmail:  jest.fn().mockResolvedValue({ sent: false, reason: 'smtp_not_configured' }),
  pushAlarm: jest.fn(),
});

function buildService(
  prismaOverrides: any = {},
  jwtOverrides: any = {},
  redisOverrides: any = {},
) {
  const prisma = makePrisma(prismaOverrides) as unknown as PrismaService;
  const jwt = { ...makeJwt(), ...jwtOverrides } as unknown as JwtService;
  const audit = makeAudit() as unknown as AuditService;
  const redis = { ...makeRedis(), ...redisOverrides };
  const notifications = makeNotifications() as unknown as NotificationsService;
  return { service: new AuthService(prisma, jwt, audit, redis, notifications), prisma, jwt, audit, redis };
}

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'STUDENT',
  isActive: true,
  passwordHash: 'hashed_password',
};

// ─── register ────────────────────────────────────────────────────────────────

describe('AuthService.register', () => {
  it('yeni kullanıcıyı kaydeder', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await service.register({ email: 'test@example.com', password: 'password123' });

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(result.email).toBe('test@example.com');
  });

  it('aynı e-posta zaten varsa BadRequestException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    await expect(service.register({ email: 'test@example.com', password: 'password123' }))
      .rejects.toThrow(BadRequestException);
  });
});

// ─── validateUser ─────────────────────────────────────────────────────────────

describe('AuthService.validateUser', () => {
  it('geçerli kullanıcı döner', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (argon2.verify as jest.Mock).mockResolvedValue(true);

    const user = await service.validateUser('test@example.com', 'password123');
    expect(user.id).toBe('user-1');
  });

  it('kullanıcı bulunamazsa UnauthorizedException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.validateUser('wrong@example.com', 'password'))
      .rejects.toThrow(UnauthorizedException);
  });

  it('pasif kullanıcı için UnauthorizedException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });

    await expect(service.validateUser('test@example.com', 'password'))
      .rejects.toThrow(UnauthorizedException);
  });

  it('yanlış şifre için UnauthorizedException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (argon2.verify as jest.Mock).mockResolvedValue(false);

    await expect(service.validateUser('test@example.com', 'wrong_password'))
      .rejects.toThrow(UnauthorizedException);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  it('başarılı girişte accessToken ve refreshToken döner', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
    (argon2.verify as jest.Mock).mockResolvedValue(true);

    const result = await service.login('test@example.com', 'password123', { ip: '127.0.0.1' });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.role).toBe('STUDENT');
  });

  it('aynı IP 10 denemeden fazlasında 429 fırlatır', async () => {
    const redis = makeRedis();
    (redis.incr).mockResolvedValue(11); // limit aşıldı
    const { service, prisma } = buildService({}, {}, redis);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (argon2.verify as jest.Mock).mockResolvedValue(true);

    await expect(service.login('test@example.com', 'password123', { ip: '192.168.1.1' }))
      .rejects.toThrow(HttpException);
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('AuthService.refresh', () => {
  it('geçerli refresh token ile yeni token çifti döner', async () => {
    const { service, prisma, redis } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    // Redis'te kayıtlı kullanıcı ID'si dön
    (redis.get as jest.Mock).mockResolvedValue('user-1');

    // JWT verify mock
    const jwtService = { ...makeJwt() };
    (jwtService.verifyAsync).mockResolvedValue({
      sub: 'user-1',
      type: 'refresh',
      jti: 'test-jti-123',
    });
    const { service: svc, prisma: p, redis: r } = buildService(
      {},
      jwtService,
      { ...makeRedis(), get: jest.fn().mockResolvedValue('user-1') },
    );
    (p.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (p.user.update as jest.Mock).mockResolvedValue(mockUser);

    const result = await svc.refresh('valid_refresh_token');

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('geçersiz token tipinde UnauthorizedException fırlatır', async () => {
    const jwtService = { ...makeJwt() };
    (jwtService.verifyAsync).mockResolvedValue({
      sub: 'user-1',
      type: 'access', // yanlış tip
      jti: 'test-jti',
    });
    const { service } = buildService({}, jwtService);

    await expect(service.refresh('wrong_type_token'))
      .rejects.toThrow(UnauthorizedException);
  });

  it('süresi dolmuş token UnauthorizedException fırlatır', async () => {
    const jwtService = { ...makeJwt() };
    (jwtService.verifyAsync).mockRejectedValue(new Error('jwt expired'));
    const { service } = buildService({}, jwtService);

    await expect(service.refresh('expired_token'))
      .rejects.toThrow(UnauthorizedException);
  });

  it("Redis'te kayıt yoksa (iptal edilmiş) UnauthorizedException fırlatır", async () => {
    const jwtService = { ...makeJwt() };
    (jwtService.verifyAsync).mockResolvedValue({
      sub: 'user-1',
      type: 'refresh',
      jti: 'revoked-jti',
    });
    const redis = { ...makeRedis(), get: jest.fn().mockResolvedValue(null) }; // Redis'te yok
    const { service } = buildService({}, jwtService, redis);

    await expect(service.refresh('revoked_token'))
      .rejects.toThrow(UnauthorizedException);
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('AuthService.logout', () => {
  it('Redis token silinir ve başarı mesajı döner', async () => {
    const jwtService = { ...makeJwt() };
    (jwtService.verifyAsync).mockResolvedValue({ jti: 'logout-jti' });
    const redis = makeRedis();
    const { service } = buildService({}, jwtService, redis);

    const result = await service.logout('valid_refresh_token');

    expect(redis.del).toHaveBeenCalledWith('rt:logout-jti');
    expect(result.message).toBeDefined();
  });

  it('geçersiz token olsa bile hata fırlatmaz', async () => {
    const jwtService = { ...makeJwt() };
    (jwtService.verifyAsync).mockRejectedValue(new Error('invalid'));
    const { service } = buildService({}, jwtService);

    await expect(service.logout('invalid_token')).resolves.toBeDefined();
  });
});
