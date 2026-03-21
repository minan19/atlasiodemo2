import { Module } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { ReportsModule } from '../reports/reports.module';
import { CertificationsModule } from '../certifications/certifications.module';
import { AuditModule } from '../audit/audit.module';
import { LtiModule } from '../lti/lti.module';
import { AiAgentsModule } from '../ai-agents/ai-agents.module';
import { PerformanceModule } from '../performance/performance.module';
import { LiveModule } from '../live/live.module';
import { InstructorPaymentsModule } from '../instructor-payments/instructor-payments.module';
import { VolunteerContentModule } from '../volunteer-content/volunteer-content.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ReportsModule,
    CertificationsModule,
    AuditModule,
    LtiModule,
    AiAgentsModule,
    PerformanceModule,
    LiveModule,
    InstructorPaymentsModule,
    VolunteerContentModule,
    PrismaModule,
  ],
  providers: [AutomationService],
})
export class AutomationModule {}
