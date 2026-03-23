import { Injectable, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class ProctoringAlarmService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getAlerts(sessionId: string) {
    const key = `proctor:session:${sessionId}`;
    const alert = await this.redis.hget(key, 'alert');
    const trust = await this.redis.hget(key, 'trust');
    return { alert: alert === '1', trust: trust ? Number(trust) : null };
  }
}
