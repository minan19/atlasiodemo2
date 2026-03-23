import { Module } from '@nestjs/common';
import { redisProvider } from './redis/redis.provider';

@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class InfraModule {}
