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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const argon2 = require("argon2");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const redis_provider_1 = require("../../infra/redis/redis.provider");
const REFRESH_TTL_S = 7 * 24 * 60 * 60;
const LOGIN_RATE_WINDOW_S = 60;
const LOGIN_RATE_MAX = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwt, audit, redis, notifications) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.audit = audit;
        this.redis = redis;
        this.notifications = notifications;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(dto, meta) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists)
            throw new common_1.BadRequestException('Email already in use');
        const passwordHash = await argon2.hash(dto.password);
        const emailVerifyToken = (0, crypto_1.randomUUID)();
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                name: dto.name,
                emailVerifyToken,
            },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
        await this.audit.log({
            actorId: user.id,
            action: 'auth.register',
            entity: 'User',
            entityId: user.id,
            ip: meta?.ip,
            ua: meta?.ua,
            meta: { email: user.email },
        });
        await this.sendVerificationEmail(user.id, user.email, emailVerifyToken);
        return user;
    }
    async sendVerificationEmail(userId, email, token) {
        const verifyUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000'}/verify-email?token=${token}`;
        await this.redis.set(`ev:${userId}`, token, 'EX', Math.ceil(VERIFY_TOKEN_TTL_MS / 1000)).catch(() => null);
        const result = await this.notifications.sendUserEmail({
            to: email,
            subject: 'Atlasio — E-posta adresinizi doğrulayın',
            text: [
                'Merhaba,',
                '',
                'Atlasio hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:',
                verifyUrl,
                '',
                'Bu bağlantı 24 saat geçerlidir.',
                'Bu e-postayı siz talep etmediyseniz görmezden gelebilirsiniz.',
            ].join('\n'),
            html: `
        <p>Merhaba,</p>
        <p>Atlasio hesabınızı aktifleştirmek için aşağıdaki butona tıklayın:</p>
        <p><a href="${verifyUrl}" style="background:#10b981;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">E-postamı doğrula</a></p>
        <p style="font-size:12px;color:#94a3b8;">Bu bağlantı 24 saat geçerlidir. Talep etmediyseniz görmezden gelin.</p>
      `,
        }).catch(() => null);
        if (!result?.sent) {
            this.logger.warn(`[DEV] E-posta doğrulama linki — ${email}: ${verifyUrl}`);
        }
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const ok = await argon2.verify(user.passwordHash, password);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid credentials');
        return user;
    }
    async checkLoginRateLimit(ip) {
        if (!ip)
            return;
        const key = `login_rl:${ip}`;
        const count = await this.redis.incr(key);
        if (count === 1)
            await this.redis.expire(key, LOGIN_RATE_WINDOW_S);
        if (count > LOGIN_RATE_MAX) {
            throw new common_1.HttpException('Çok fazla giriş denemesi. Lütfen 1 dakika bekleyin.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
    }
    async login(email, password, meta) {
        await this.checkLoginRateLimit(meta?.ip);
        const user = await this.validateUser(email, password);
        const { accessToken, refreshToken, jti } = await this.signTokenPair(user.id, user.role, user.email, user.tenantId ?? 'public');
        await this.redis.set(`rt:${jti}`, user.id, 'EX', REFRESH_TTL_S);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        await this.audit.log({
            actorId: user.id,
            action: 'auth.login',
            entity: 'User',
            entityId: user.id,
            ip: meta?.ip,
            ua: meta?.ua,
            meta: { email },
        });
        return {
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        };
    }
    async refresh(token, meta) {
        let payload;
        try {
            payload = await this.jwt.verifyAsync(token, {
                secret: process.env.JWT_SECRET,
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Refresh token geçersiz veya süresi dolmuş');
        }
        if (payload.type !== 'refresh') {
            throw new common_1.UnauthorizedException('Geçersiz token tipi');
        }
        const storedUserId = await this.redis.get(`rt:${payload.jti}`);
        if (!storedUserId || storedUserId !== payload.sub) {
            throw new common_1.UnauthorizedException('Refresh token iptal edilmiş veya geçersiz');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, name: true, role: true, isActive: true },
        });
        if (!user || !user.isActive)
            throw new common_1.UnauthorizedException('Hesap aktif değil');
        await this.redis.del(`rt:${payload.jti}`);
        const fullUser = await this.prisma.user.findUnique({ where: { id: user.id }, select: { tenantId: true } });
        const { accessToken, refreshToken, jti: newJti } = await this.signTokenPair(user.id, user.role, user.email, fullUser?.tenantId ?? 'public');
        await this.redis.set(`rt:${newJti}`, user.id, 'EX', REFRESH_TTL_S);
        await this.audit.log({
            actorId: user.id,
            action: 'auth.token_refresh',
            entity: 'User',
            entityId: user.id,
            ip: meta?.ip,
            ua: meta?.ua,
        });
        return {
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        };
    }
    async logout(token) {
        try {
            const payload = await this.jwt.verifyAsync(token, {
                secret: process.env.JWT_SECRET,
            });
            await this.redis.del(`rt:${payload.jti}`);
        }
        catch {
        }
        return { message: 'Çıkış yapıldı' };
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
            return { sent: true };
        }
        const token = (0, crypto_1.randomUUID)();
        const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordResetToken: token, passwordResetExpiry: expiry },
        });
        const resetUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000'}/reset-password?token=${token}`;
        const result = await this.notifications.sendUserEmail({
            to: user.email,
            subject: 'Atlasio — Şifre sıfırlama',
            text: [
                'Merhaba,',
                '',
                'Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:',
                resetUrl,
                '',
                'Bu bağlantı 1 saat geçerlidir.',
                'Bu isteği siz yapmadıysanız görmezden gelebilirsiniz.',
            ].join('\n'),
            html: `
        <p>Merhaba,</p>
        <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
        <p><a href="${resetUrl}" style="background:#10b981;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Şifremi sıfırla</a></p>
        <p style="font-size:12px;color:#94a3b8;">Bu bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız görmezden gelin.</p>
      `,
        }).catch(() => null);
        if (!result?.sent) {
            this.logger.warn(`[DEV] Şifre sıfırlama tokeni — ${user.email}: ${resetUrl}`);
        }
        return { sent: true };
    }
    async resetPassword(token, newPassword, meta) {
        const user = await this.prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpiry: { gte: new Date() },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı');
        }
        const passwordHash = await argon2.hash(newPassword);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpiry: null,
            },
        });
        await this.audit.log({
            actorId: user.id,
            action: 'auth.password_reset',
            entity: 'User',
            entityId: user.id,
            ip: meta?.ip,
            ua: meta?.ua,
            meta: { email: user.email },
        });
        return { ok: true, message: 'Şifreniz başarıyla güncellendi' };
    }
    async verifyEmail(token, meta) {
        const user = await this.prisma.user.findFirst({
            where: { emailVerifyToken: token },
        });
        if (!user) {
            throw new common_1.BadRequestException('Geçersiz veya süresi dolmuş doğrulama bağlantısı');
        }
        if (user.emailVerified) {
            return { ok: true, message: 'E-posta zaten doğrulanmış' };
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, emailVerifyToken: null },
        });
        await this.redis.del(`ev:${user.id}`).catch(() => null);
        await this.audit.log({
            actorId: user.id,
            action: 'auth.email_verified',
            entity: 'User',
            entityId: user.id,
            ip: meta?.ip,
            ua: meta?.ua,
            meta: { email: user.email },
        });
        return { ok: true, message: 'E-posta başarıyla doğrulandı' };
    }
    async resendVerification(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, emailVerified: true, emailVerifyToken: true },
        });
        if (!user)
            throw new common_1.BadRequestException('Kullanıcı bulunamadı');
        if (user.emailVerified)
            return { sent: false, reason: 'already_verified' };
        const existingTtl = await this.redis.ttl(`ev:${userId}`).catch(() => 0);
        const RESEND_COOLDOWN_S = 5 * 60;
        const remainingS = existingTtl > 0 ? existingTtl : 0;
        if (remainingS > Math.ceil(VERIFY_TOKEN_TTL_MS / 1000) - RESEND_COOLDOWN_S) {
            throw new common_1.HttpException(`Lütfen ${RESEND_COOLDOWN_S / 60} dakika sonra tekrar deneyin.`, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const newToken = (0, crypto_1.randomUUID)();
        await this.prisma.user.update({
            where: { id: user.id },
            data: { emailVerifyToken: newToken },
        });
        await this.sendVerificationEmail(user.id, user.email, newToken);
        return { sent: true };
    }
    async signTokenPair(userId, role, email, tenantId = 'public') {
        const jti = (0, crypto_1.randomUUID)();
        const accessToken = await this.jwt.signAsync({ sub: userId, role, email, tenantId }, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
        const refreshToken = await this.jwt.signAsync({ sub: userId, type: 'refresh', jti }, {
            secret: process.env.JWT_SECRET,
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        });
        return { accessToken, refreshToken, jti };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(redis_provider_1.REDIS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        audit_service_1.AuditService, Function, notifications_service_1.NotificationsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map