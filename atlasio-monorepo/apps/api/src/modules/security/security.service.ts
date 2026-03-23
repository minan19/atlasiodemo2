import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { OpsWebhookService } from '../ops/ops.webhook.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DefenseActionState,
  DefenseActionType,
  SecurityEventSeverity,
  SecurityEventStatus,
} from '@prisma/client';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly ttlSeconds = Number(process.env.SECURITY_BLOCK_TTL || 900); // 15 dk varsayılan
  private readonly rateWindowSeconds = Number(process.env.SECURITY_RATE_WINDOW || 60);
  private readonly rateThreshold = Number(process.env.SECURITY_RATE_THRESHOLD || 120);
  private readonly rateEventCooldown = Number(process.env.SECURITY_RATE_EVENT_COOLDOWN || 300);
  private readonly patternDetectEnabled = process.env.SECURITY_PATTERN_DETECT !== '0';
  private readonly patternCooldownSeconds = Number(process.env.SECURITY_PATTERN_COOLDOWN || 300);

  // Basit saldırı imza listesi (regex). Minimal false-positive ile başlat.
  private readonly sqliPatterns = [
    /union\s+select/i,
    /or\s+1=1/i,
    /sleep\(\d+\)/i,
    /xp_cmdshell/i,
  ];
  private readonly xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
  ];

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly opsWebhook: OpsWebhookService,
    private readonly notifications: NotificationsService,
  ) {}

  private denyKey(ip: string) {
    return `deny:ip:${ip}`;
  }

  async tempBlock(ip: string, ttlSeconds: number) {
    await this.redis.set(this.denyKey(ip), '1', 'EX', ttlSeconds);
    this.logger.warn(`Temp block ${ip} for ${ttlSeconds}s`);
  }

  async tempUnblock(ip: string) {
    await this.redis.del(this.denyKey(ip));
    this.logger.log(`Temp unblock ${ip}`);
  }

  async markHoneypotHit(ip: string) {
    await this.tempBlock(ip, this.ttlSeconds);
    this.logger.warn(`Honeypot hit from ${ip} -> temp deny ${this.ttlSeconds}s`);
    await this.opsWebhook.notify('Security honeypot', `Honeypot hit from ${ip}`, { ip });
    await this.notifications.sendAdminAlert('Honeypot tetiklendi', `IP: ${ip}`, { ip });

    // SecurityEvent + DefenseAction kayıtları
    const event = await this.prisma.securityEvent.create({
      data: {
        source: 'honeypot',
        category: 'intrusion',
        eventType: 'honeypot_hit',
        severity: SecurityEventSeverity.HIGH,
        status: SecurityEventStatus.MITIGATED,
        actorIp: ip,
        description: `Honeypot tetiklendi, IP geçici olarak engellendi (${this.ttlSeconds}s)`,
        payload: { ip },
      },
    });

    await this.prisma.defenseAction.create({
      data: {
        eventId: event.id,
        actionType: DefenseActionType.BLOCK_IDENTITY,
        target: ip,
        params: { ttlSeconds: this.ttlSeconds },
        state: DefenseActionState.APPLIED,
        reason: 'Honeypot hit -> otomatik blok',
        createdBy: 'atlasio-autodefense',
        appliedAt: new Date(),
      },
    });
  }

  async isDenied(ip: string) {
    const v = await this.redis.get(this.denyKey(ip));
    return v === '1';
  }

  /**
   * Basit RPS eşik takibi: sadece uyarı/öneri üretir, otomatik blok yapmaz.
   */
  async observeRequest(ip: string, path: string) {
    if (!ip) return;
    const bucket = Math.floor(Date.now() / (this.rateWindowSeconds * 1000));
    const key = `sec:req:${ip}:${bucket}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, this.rateWindowSeconds + 5);
    }

    if (count > this.rateThreshold) {
      const cooldownKey = `sec:event_sent:${ip}`;
      const alreadySent = await this.redis.set(cooldownKey, '1', 'EX', this.rateEventCooldown, 'NX');
      if (!alreadySent) return;

      this.logger.warn(`Rate threshold exceeded from ${ip} (${count}/${this.rateWindowSeconds}s)`);

      const event = await this.prisma.securityEvent.create({
        data: {
          source: 'edge',
          category: 'rate_limit',
          eventType: 'rps_threshold',
          severity: SecurityEventSeverity.MEDIUM,
          status: SecurityEventStatus.OPEN,
          actorIp: ip,
          description: `IP ${ip} ${this.rateWindowSeconds}s içinde ${count} istek yaptı (eşik ${this.rateThreshold})`,
          payload: { ip, path, count, windowSeconds: this.rateWindowSeconds, threshold: this.rateThreshold },
        },
      });

      await this.prisma.defenseAction.create({
        data: {
          eventId: event.id,
          actionType: DefenseActionType.RATE_LIMIT,
          target: ip,
          params: { windowSeconds: this.rateWindowSeconds, threshold: this.rateThreshold },
          state: DefenseActionState.PROPOSED,
          reason: 'RPS eşiği aşıldı',
          createdBy: 'atlasio-autodefense',
        },
      });
    }
  }

  /**
   * Basit pattern tespiti: SQLi / XSS imzalarını URL’de arar; öneri üretir.
   */
  async detectPatterns(ip: string, url: string) {
    if (!this.patternDetectEnabled || !ip || !url) return;
    const lowered = decodeURIComponent(url).toLowerCase();
    const hitSql = this.sqliPatterns.some((r) => r.test(lowered));
    const hitXss = this.xssPatterns.some((r) => r.test(lowered));
    if (!hitSql && !hitXss) return;

    const sig = hitSql ? 'sqli' : 'xss';
    const coolKey = `sec:pat:${sig}:${ip}`;
    const sent = await this.redis.set(coolKey, '1', 'EX', this.patternCooldownSeconds, 'NX');
    if (!sent) return;

    const severity = hitSql ? SecurityEventSeverity.HIGH : SecurityEventSeverity.MEDIUM;
    const event = await this.prisma.securityEvent.create({
      data: {
        source: 'edge',
        category: 'pattern',
        eventType: `${sig}_pattern`,
        severity,
        status: SecurityEventStatus.OPEN,
        actorIp: ip,
        description: `Şüpheli ${sig.toUpperCase()} pattern tespit edildi`,
        payload: { ip, url },
      },
    });

    await this.prisma.defenseAction.create({
      data: {
        eventId: event.id,
        actionType: DefenseActionType.WAF_RULE,
        target: ip,
        params: { pattern: sig },
        state: DefenseActionState.PROPOSED,
        reason: `${sig.toUpperCase()} pattern tespiti`,
        createdBy: 'atlasio-autodefense',
      },
    });
  }
}
