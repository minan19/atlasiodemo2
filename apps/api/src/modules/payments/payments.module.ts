import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { IyzicoService } from './providers/iyzico.service';
import { OpsModule } from '../ops/ops.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AntiFraudService } from './anti-fraud.service';

@Module({
  imports: [PrismaModule, AuditModule, OpsModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, IyzicoService, AntiFraudService],
})
export class PaymentsModule {}
