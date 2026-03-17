import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Süresi dolmuş geçici token'ları DB'den temizler.
 * Her gece 02:00'da çalışır (sunucu yerel saati).
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Süresi dolmuş şifre sıfırlama token'larını temizle.
   * Her gün gece 02:00'da çalışır.
   */
  @Cron('0 2 * * *', { name: 'cleanup-password-reset-tokens' })
  async cleanExpiredPasswordResetTokens() {
    const result = await this.prisma.user.updateMany({
      where: {
        passwordResetToken: { not: null },
        passwordResetExpiry: { lt: new Date() },
      },
      data: {
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Temizlendi: ${result.count} adet süresi dolmuş şifre sıfırlama token'ı`);
    }
  }

  /**
   * Süresi dolmuş e-posta doğrulama token'larını temizle.
   * Her gün gece 02:05'te çalışır.
   * Not: emailVerifyToken için DB'de expiry alanı yok — Redis TTL yönetiyor.
   *      24 saat geçmiş ve hâlâ doğrulanmamış hesaplar için token sıfırla.
   */
  @Cron('5 2 * * *', { name: 'cleanup-email-verify-tokens' })
  async cleanStalePendingVerifications() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 saat önce

    const result = await this.prisma.user.updateMany({
      where: {
        emailVerified: false,
        emailVerifyToken: { not: null },
        createdAt: { lt: cutoff }, // 24 saatten eski token'lar temizlenir
      },
      data: { emailVerifyToken: null },
    });

    if (result.count > 0) {
      this.logger.log(`Temizlendi: ${result.count} adet süresi dolmuş e-posta doğrulama token'ı`);
    }
  }

  /**
   * Manuel tetikleme için (test veya admin paneli).
   */
  async runAll() {
    await this.cleanExpiredPasswordResetTokens();
    await this.cleanStalePendingVerifications();
    return { ok: true, ran: ['password-reset', 'email-verify'] };
  }
}
