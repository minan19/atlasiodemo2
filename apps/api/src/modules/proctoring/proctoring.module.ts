import { Module } from '@nestjs/common';
import { ProctoringService } from './proctoring.service';
import { ProctoringController } from './proctoring.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ProctoringAlarmService } from './alarm.service';
import { ProctoringNoSqlWriter } from './proctoring.nosql';

@Module({
  imports: [
    PrismaModule,
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    }),
  ],
  controllers: [ProctoringController],
  providers: [ProctoringService, ProctoringAlarmService, ProctoringNoSqlWriter],
})
export class ProctoringModule {}
