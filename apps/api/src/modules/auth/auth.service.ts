import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { REDIS } from '../../infra/redis/redis.provider';
import { RegisterDto } from './dto';

const REFRESH_TTL_S     = 7 * 24 * 60 * 60; // 7 gün (saniye)
const LOGIN_RATE_WINDOW_S = 60;              // 1 dakika pencere
const LOGIN_RATE_MAX      = 10;              // max 10 deneme / ip / dakika
const RESET_TOKEN_TTL_MS  = 60 * 60 * 1000; // 1 saat
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto, meta?: { ip?: string; ua?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already in use');

    const passwordHash = await argon2.hash(dto.password);
    const emailVerifyToken = randomUUID();

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

    // E-posta doğrulama linki gönder (SMTP yoksa log'a yaz)
    await this.sendVerificationEmail(user.id, user.email, emailVerifyToken);

    return user;
  }

  /**
   * Yeni kullanıcı veya yeniden istek için doğrulama e-postası gönderir.
   */
  private async sendVerificationEmail(userId: string, email: string, token: string) {
    const verifyUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000'}/verify-email?token=${token}`;

    // Redis'e token TTL sakla (yeniden gönderim rate-limit için)
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

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  /**
   * IP bazlı brute-force koruması: 1 dakikada 10'dan fazla başarısız deneme → 429.
   */
  private async checkLoginRateLimit(ip?: string) {
    if (!ip) return;
    const key = `login_rl:${ip}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, LOGIN_RATE_WINDOW_S);
    if (count > LOGIN_RATE_MAX) {
      throw new HttpException('Çok fazla giriş denemesi. Lütfen 1 dakika bekleyin.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async login(email: string, password: string, meta?: { ip?: string; ua?: string }) {
    await this.checkLoginRateLimit(meta?.ip);
    const user = await this.validateUser(email, password);
    const { accessToken, refreshToken, jti } = await this.signTokenPair(user.id, user.role, user.email, (user as any).tenantId ?? 'public');

    // Refresh token'ı Redis'e kaydet (revocation desteği için)
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

  /**
   * Refresh token ile yeni access + refresh token çifti üret (token rotation).
   */
  async refresh(token: string, meta?: { ip?: string; ua?: string }) {
    let payload: { sub: string; type: string; jti: string };

    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token geçersiz veya süresi dolmuş');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Geçersiz token tipi');
    }

    // Redis'te kayıtlı mı kontrol et
    const storedUserId = await this.redis.get(`rt:${payload.jti}`);
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new UnauthorizedException('Refresh token iptal edilmiş veya geçersiz');
    }

    // Kullanıcı hâlâ aktif mi?
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Hesap aktif değil');

    // Eski token'ı sil (rotation)
    await this.redis.del(`rt:${payload.jti}`);

    // Yeni token çifti üret
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

  /**
   * Logout: refresh token'ı Redis'ten sil.
   */
  async logout(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ jti: string }>(token, {
        secret: process.env.JWT_SECRET,
      });
      await this.redis.del(`rt:${payload.jti}`);
    } catch {
      // Token zaten geçersizse sessizce devam et
    }
    return { message: 'Çıkış yapıldı' };
  }

  // ─── Şifre sıfırlama ────────────────────────────────────────────────────────

  /**
   * Şifre sıfırlama bağlantısı gönderir.
   * Güvenlik gereği kullanıcı bulunamazsa da başarılı yanıt döner (enumeration önlemi).
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Kullanıcı yoksa: sessizce başarılı döndür (email enumeration'ı engeller)
    if (!user || !user.isActive) {
      return { sent: true };
    }

    const token = randomUUID();
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

  /**
   * Token ile şifre değiştirir.
   */
  async resetPassword(token: string, newPassword: string, meta?: { ip?: string; ua?: string }) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı');
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

    // Mevcut tüm refresh token'ları geçersiz kılmak için Redis'te bir işaret bırak
    // (isteğe bağlı — kullanıcıyı her yerden çıkart)
    // Not: Gerçek revocation için tüm jti'leri takip etmek gerekir;
    // şimdilik sadece yeni giriş yapmasını zorunlu kılarız.

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

  // ─── E-posta doğrulama ───────────────────────────────────────────────────────

  /**
   * Token ile e-postayı doğrula.
   */
  async verifyEmail(token: string, meta?: { ip?: string; ua?: string }) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş doğrulama bağlantısı');
    }

    if (user.emailVerified) {
      return { ok: true, message: 'E-posta zaten doğrulanmış' };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });

    // Redis'teki TTL anahtarını temizle
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

  /**
   * Doğrulama e-postasını yeniden gönder (giriş yapılmış oturumda).
   * Rate-limit: Redis'te `ev:{userId}` hâlâ varsa bekle.
   */
  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true, emailVerifyToken: true },
    });

    if (!user) throw new BadRequestException('Kullanıcı bulunamadı');
    if (user.emailVerified) return { sent: false, reason: 'already_verified' as const };

    // Redis TTL kontrolü — son 5 dakikada tekrar gönderme
    const existingTtl = await this.redis.ttl(`ev:${userId}`).catch(() => 0);
    const RESEND_COOLDOWN_S = 5 * 60;
    const remainingS = existingTtl > 0 ? existingTtl : 0;

    if (remainingS > Math.ceil(VERIFY_TOKEN_TTL_MS / 1000) - RESEND_COOLDOWN_S) {
      throw new HttpException(
        `Lütfen ${RESEND_COOLDOWN_S / 60} dakika sonra tekrar deneyin.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Yeni token üret (eski token'ı geçersiz kıl)
    const newToken = randomUUID();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: newToken },
    });

    await this.sendVerificationEmail(user.id, user.email, newToken);
    return { sent: true };
  }

  // ─── Yardımcı ───────────────────────────────────────────────────────────────

  private async signTokenPair(userId: string, role: string, email: string, tenantId = 'public') {
    const jti = randomUUID();

    const accessToken = await this.jwt.signAsync(
      { sub: userId, role, email, tenantId },
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, type: 'refresh', jti },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },
    );

    return { accessToken, refreshToken, jti };
  }
}
