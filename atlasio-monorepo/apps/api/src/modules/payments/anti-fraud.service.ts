import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';
import { OpsWebhookService } from '../ops/ops.webhook.service';
import { NotificationsService } from '../notifications/notifications.service';

const FAIL_KEY = (ip: string) => `pfail:${ip}`;
const BLOCK_KEY = (ip: string) => `pblock:${ip}`;

@Injectable()
export class AntiFraudService {
  private readonly maxFails = Number(process.env.PAYMENT_FAIL_MAX ?? 5);
  private readonly blockTtl = Number(process.env.PAYMENT_BLOCK_TTL ?? 1800); // 30 dk

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly ops: OpsWebhookService,
    private readonly notifications: NotificationsService,
  ) {}

  async assertNotBlocked(ip?: string) {
    if (!ip) return;
    const blocked = await this.redis.exists(BLOCK_KEY(ip));
    if (blocked) {
      throw new ForbiddenException('Ödeme denemesi geçici olarak engellendi');
    }
  }

  async recordFailure(userId?: string | null, ip?: string | null) {
    if (!ip) return;
    const count = await this.redis.incr(FAIL_KEY(ip));
    if (count === 1) await this.redis.expire(FAIL_KEY(ip), 3600);
    if (count >= this.maxFails) {
      await this.redis.set(BLOCK_KEY(ip), '1', 'EX', this.blockTtl);
      await this.ops.notify('Payment fraud block', `IP ${ip} temporarily blocked`, { userId, ip, fails: count });
      await this.notifications.sendAdminAlert('Payment fraud block', `IP ${ip} engellendi`, { userId, ip, fails: count });
    }
  }

  async clearFailures(ip?: string | null) {
    if (!ip) return;
    await this.redis.del(FAIL_KEY(ip));
  }
}
