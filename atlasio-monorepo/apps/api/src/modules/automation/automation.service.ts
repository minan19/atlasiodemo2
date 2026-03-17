import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportsService } from '../reports/reports.service';
import { CertificationsService } from '../certifications/certifications.service';
import { AuditService } from '../audit/audit.service';
import { LtiService } from '../lti/lti.service';
import { AiAgentsService } from '../ai-agents/ai-agents.service';
import { PerformanceService } from '../performance/performance.service';
import { InstructorPaymentsService } from '../instructor-payments/instructor-payments.service';
import { VolunteerContentService } from '../volunteer-content/volunteer-content.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);
  private isRunning = false;

  constructor(
    private readonly reports: ReportsService,
    private readonly certifications: CertificationsService,
    private readonly audit: AuditService,
    private readonly lti: LtiService,
    private readonly aiAgents: AiAgentsService,
    private readonly performance: PerformanceService,
    private readonly instructorPayments: InstructorPaymentsService,
    private readonly volunteerContent: VolunteerContentService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runMaintenanceTick() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const [reportDispatch, certExpiry] = await Promise.all([
        this.reports.dispatchDueSchedules(),
        this.certifications.markExpiries(),
      ]);

      await this.audit.log({
        action: 'automation.tick',
        entity: 'System',
        meta: {
          reportDispatch,
          certExpiry,
        },
      });
      this.logger.log(
        `Automation tick completed: reports=${reportDispatch.processed}, certExpiry=${certExpiry.updated}`,
      );
    } catch (error: any) {
      this.logger.error(`Automation tick failed: ${error?.message ?? 'unknown error'}`);
    } finally {
      this.isRunning = false;
    }
  }

  @Cron('0 0 * * *')
  async rotateLtiKeys() {
    await this.lti.rotateKeys();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async generateAiSummaries() {
    await this.aiAgents.generatePeriodicSummary();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async capturePerformanceSnapshot() {
    const snapshot = await this.performance.captureAggregate();
    this.logger.log(`Performance snapshot created (${snapshot.id})`);
  }

  @Cron('0 3 * * *')
  async generateInstructorPayouts() {
    const batch = await this.instructorPayments.runDailyPayroll();
    this.logger.log(
      `Instructor payout batch generated (${batch.count} instructors).`,
    );
  }

  @Cron('0 4 * * *')
  async refreshValueScores() {
    const instructors = await this.prisma.user.findMany({
      where: { role: 'INSTRUCTOR' },
      select: { id: true },
    });
    for (const instructor of instructors) {
      await this.volunteerContent.recordValueScore(instructor.id);
    }
    this.logger.log(`Instructor value scores refreshed for ${instructors.length} educators.`);
  }
}
