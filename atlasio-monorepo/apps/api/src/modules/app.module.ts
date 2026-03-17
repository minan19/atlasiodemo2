import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { ReportsModule } from './reports/reports.module';
import { DocumentsModule } from './documents/documents.module';
import { AuditModule } from './audit/audit.module';
import { LessonsModule } from './lessons/lessons.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { LearningPlansModule } from './learning-plans/learning-plans.module';
import { CertificationsModule } from './certifications/certifications.module';
import { HealthModule } from './health/health.module';
import { OpsModule } from './ops/ops.module';
import { AutomationModule } from './automation/automation.module';
import { LtiModule } from './lti/lti.module';
import { AiAgentsModule } from './ai-agents/ai-agents.module';
import { PerformanceModule } from './performance/performance.module';
import { LiveModule } from './live/live.module';
import { VolunteerContentModule } from './volunteer-content/volunteer-content.module';
import { InstructorPaymentsModule } from './instructor-payments/instructor-payments.module';
import { ProctoringModule } from './proctoring/proctoring.module';
import { GhostMentorModule } from './ghost-mentor/ghost-mentor.module';
import { WhiteboardModule } from './whiteboard/whiteboard.module';
import { HoneypotController } from './security/honeypot.controller';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DefenseModule } from './defense/defense.module';
import { SecurityModule } from './security/security.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { InstructorInsightsModule } from './instructor-insights/instructor-insights.module';
import { QuizModule } from './quiz/quiz.module';
import { BookingModule } from './booking/booking.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { SsoModule } from './sso/sso.module';
import { EventStreamModule } from './event-stream/event-stream.module';
import { AiSafetyModule } from './ai-safety/ai-safety.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { ObservabilityModule } from './observability/observability.module';
import { TenantGuard } from './auth/tenant.guard';
import { TenantContextMiddleware } from './prisma/tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name:  'short',
        ttl:   1000,   // 1 saniye
        limit: 20,     // max 20 istek/sn (burst koruma)
      },
      {
        name:  'medium',
        ttl:   60_000, // 1 dakika
        limit: 200,    // max 200 istek/dk
      },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    DocumentsModule,
    ReportsModule,
    LessonsModule,
    EnrollmentsModule,
    LearningPlansModule,
    CertificationsModule,
    HealthModule,
    OpsModule,
    AutomationModule,
    LtiModule,
    AiAgentsModule,
    PerformanceModule,
    LiveModule,
    InstructorPaymentsModule,
    VolunteerContentModule,
    ProctoringModule,
    GhostMentorModule,
    WhiteboardModule,
    PaymentsModule,
    NotificationsModule,
    DefenseModule,
    SecurityModule,
    TelemetryModule,
    InstructorInsightsModule,
    QuizModule,
    BookingModule,
    CleanupModule,
    SsoModule,
    EventStreamModule,
    AiSafetyModule,
    RecommendationModule,
    ConnectorsModule,
    ObservabilityModule,
  ],
  providers: [
    // Tüm rotalar için global rate limit guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global tenant isolation guard — JWT'den tenantId'yi req.tenantId'ye yazar
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
  controllers: [HoneypotController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // TenantContextMiddleware: Postgres RLS session parametresini ayarlar
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
