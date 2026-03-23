"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const courses_module_1 = require("./courses/courses.module");
const reports_module_1 = require("./reports/reports.module");
const documents_module_1 = require("./documents/documents.module");
const audit_module_1 = require("./audit/audit.module");
const lessons_module_1 = require("./lessons/lessons.module");
const enrollments_module_1 = require("./enrollments/enrollments.module");
const learning_plans_module_1 = require("./learning-plans/learning-plans.module");
const certifications_module_1 = require("./certifications/certifications.module");
const health_module_1 = require("./health/health.module");
const ops_module_1 = require("./ops/ops.module");
const automation_module_1 = require("./automation/automation.module");
const lti_module_1 = require("./lti/lti.module");
const ai_agents_module_1 = require("./ai-agents/ai-agents.module");
const performance_module_1 = require("./performance/performance.module");
const live_module_1 = require("./live/live.module");
const volunteer_content_module_1 = require("./volunteer-content/volunteer-content.module");
const instructor_payments_module_1 = require("./instructor-payments/instructor-payments.module");
const proctoring_module_1 = require("./proctoring/proctoring.module");
const ghost_mentor_module_1 = require("./ghost-mentor/ghost-mentor.module");
const whiteboard_module_1 = require("./whiteboard/whiteboard.module");
const honeypot_controller_1 = require("./security/honeypot.controller");
const payments_module_1 = require("./payments/payments.module");
const notifications_module_1 = require("./notifications/notifications.module");
const defense_module_1 = require("./defense/defense.module");
const security_module_1 = require("./security/security.module");
const telemetry_module_1 = require("./telemetry/telemetry.module");
const instructor_insights_module_1 = require("./instructor-insights/instructor-insights.module");
const quiz_module_1 = require("./quiz/quiz.module");
const booking_module_1 = require("./booking/booking.module");
const cleanup_module_1 = require("./cleanup/cleanup.module");
const sso_module_1 = require("./sso/sso.module");
const event_stream_module_1 = require("./event-stream/event-stream.module");
const ai_safety_module_1 = require("./ai-safety/ai-safety.module");
const recommendation_module_1 = require("./recommendation/recommendation.module");
const connectors_module_1 = require("./connectors/connectors.module");
const observability_module_1 = require("./observability/observability.module");
const tenant_guard_1 = require("./auth/tenant.guard");
const tenant_context_middleware_1 = require("./prisma/tenant-context.middleware");
const gamification_module_1 = require("./gamification/gamification.module");
const entitlement_service_1 = require("./entitlement/entitlement.service");
const departments_module_1 = require("./departments/departments.module");
const guardians_module_1 = require("./guardians/guardians.module");
const smart_classroom_module_1 = require("./smart-classroom/smart-classroom.module");
const math_engine_module_1 = require("./math-engine/math-engine.module");
const language_lab_module_1 = require("./language-lab/language-lab.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(tenant_context_middleware_1.TenantContextMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 20,
                },
                {
                    name: 'medium',
                    ttl: 60_000,
                    limit: 200,
                },
            ]),
            prisma_module_1.PrismaModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            courses_module_1.CoursesModule,
            documents_module_1.DocumentsModule,
            reports_module_1.ReportsModule,
            lessons_module_1.LessonsModule,
            enrollments_module_1.EnrollmentsModule,
            learning_plans_module_1.LearningPlansModule,
            certifications_module_1.CertificationsModule,
            health_module_1.HealthModule,
            ops_module_1.OpsModule,
            automation_module_1.AutomationModule,
            lti_module_1.LtiModule,
            ai_agents_module_1.AiAgentsModule,
            performance_module_1.PerformanceModule,
            live_module_1.LiveModule,
            instructor_payments_module_1.InstructorPaymentsModule,
            volunteer_content_module_1.VolunteerContentModule,
            proctoring_module_1.ProctoringModule,
            ghost_mentor_module_1.GhostMentorModule,
            whiteboard_module_1.WhiteboardModule,
            payments_module_1.PaymentsModule,
            notifications_module_1.NotificationsModule,
            defense_module_1.DefenseModule,
            security_module_1.SecurityModule,
            telemetry_module_1.TelemetryModule,
            instructor_insights_module_1.InstructorInsightsModule,
            quiz_module_1.QuizModule,
            booking_module_1.BookingModule,
            cleanup_module_1.CleanupModule,
            sso_module_1.SsoModule,
            event_stream_module_1.EventStreamModule,
            ai_safety_module_1.AiSafetyModule,
            recommendation_module_1.RecommendationModule,
            connectors_module_1.ConnectorsModule,
            observability_module_1.ObservabilityModule,
            gamification_module_1.GamificationModule,
            departments_module_1.DepartmentsModule,
            guardians_module_1.GuardiansModule,
            entitlement_service_1.EntitlementModule,
            smart_classroom_module_1.SmartClassroomModule,
            math_engine_module_1.MathEngineModule,
            language_lab_module_1.LanguageLabModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: tenant_guard_1.TenantGuard },
        ],
        controllers: [honeypot_controller_1.HoneypotController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map