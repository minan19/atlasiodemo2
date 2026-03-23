import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OpsController } from './ops.controller';
import { MetricsService } from './metrics.service';
import { LatencyInterceptor } from './latency.interceptor';
import { PrismaModule } from '../prisma/prisma.module';
import { OpsWebhookService } from './ops.webhook.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [OpsController],
  providers: [
    MetricsService,
    OpsWebhookService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LatencyInterceptor,
    },
  ],
  exports: [MetricsService, OpsWebhookService],
})
export class OpsModule {}
