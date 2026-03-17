import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';
import { NginxService } from './nginx.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DefenseCleanupService {
  private readonly logger = new Logger(DefenseCleanupService.name);
  private readonly denyPath =
    process.env.NGINX_DENY_PATH || '/etc/nginx/deny_autodefense.conf';

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly nginx: NginxService,
  ) {}

  /**
   * Her 10 dakikada bir deny dosyasını Redis ile senkronlar:
   * - Redis'te TTL'i bitmiş IP varsa dosyadan çıkarır.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncDenyFile() {
    try {
      const denyIps = await this.readDenyIps();
      if (denyIps.length === 0) return;

      const alive: string[] = [];
      for (const ip of denyIps) {
        const stillBlocked = await this.redis.get(this.redisKey(ip));
        if (stillBlocked) alive.push(ip);
        else {
          await this.nginx.removeDeny(ip);
        }
      }
      if (alive.length !== denyIps.length) {
        this.logger.log(
          `Deny file sync: cleaned ${denyIps.length - alive.length} expired entries`,
        );
      }
    } catch (err) {
      this.logger.error(`syncDenyFile failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  private redisKey(ip: string) {
    return `deny:ip:${ip}`;
  }

  private async readDenyIps(): Promise<string[]> {
    try {
      await fs.promises.access(this.denyPath);
      const content = await fs.promises.readFile(this.denyPath, 'utf8');
      return content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('deny '))
        .map((l) => l.replace(/^deny\s+/, '').replace(/;$/, '').trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}
