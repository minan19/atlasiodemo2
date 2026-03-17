import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OpsModule } from '../ops/ops.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SecurityService } from './security.service';
import { HoneypotController } from './honeypot.controller';
import { SecuritySummaryController } from './summary.controller';

@Module({
  imports: [PrismaModule, OpsModule, NotificationsModule],
  providers: [SecurityService],
  exports: [SecurityService],
  controllers: [HoneypotController, SecuritySummaryController],
})
export class SecurityModule {}
