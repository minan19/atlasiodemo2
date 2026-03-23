import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { InfraModule } from '../../infra/infra.module';

@Module({
  imports: [DocumentsModule, NotificationsModule, AuthModule, InfraModule],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService, AdminReportsService, PrismaService],
  exports: [ReportsService, AdminReportsService],
})
export class ReportsModule {}
