import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from '../../infra/redis/redis.provider';
import { WINDOWS, classInsightsKey, studentInsightsKey } from './utils/cache-keys';

@Injectable()
export class InstructorInsightsCache {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async invalidateForStudentInClass(classId: string, studentId: string) {
    const keys: string[] = [];
    for (const w of WINDOWS) {
      keys.push(classInsightsKey(classId, w));
      keys.push(studentInsightsKey(classId, studentId, w));
    }
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }
}
