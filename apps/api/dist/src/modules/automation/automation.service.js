"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AutomationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const reports_service_1 = require("../reports/reports.service");
const certifications_service_1 = require("../certifications/certifications.service");
const audit_service_1 = require("../audit/audit.service");
const lti_service_1 = require("../lti/lti.service");
const ai_agents_service_1 = require("../ai-agents/ai-agents.service");
const performance_service_1 = require("../performance/performance.service");
const instructor_payments_service_1 = require("../instructor-payments/instructor-payments.service");
const volunteer_content_service_1 = require("../volunteer-content/volunteer-content.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AutomationService = AutomationService_1 = class AutomationService {
    constructor(reports, certifications, audit, lti, aiAgents, performance, instructorPayments, volunteerContent, prisma) {
        this.reports = reports;
        this.certifications = certifications;
        this.audit = audit;
        this.lti = lti;
        this.aiAgents = aiAgents;
        this.performance = performance;
        this.instructorPayments = instructorPayments;
        this.volunteerContent = volunteerContent;
        this.prisma = prisma;
        this.logger = new common_1.Logger(AutomationService_1.name);
        this.isRunning = false;
    }
    async runMaintenanceTick() {
        if (this.isRunning)
            return;
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
            this.logger.log(`Automation tick completed: reports=${reportDispatch.processed}, certExpiry=${certExpiry.updated}`);
        }
        catch (error) {
            this.logger.error(`Automation tick failed: ${error?.message ?? 'unknown error'}`);
        }
        finally {
            this.isRunning = false;
        }
    }
    async rotateLtiKeys() {
        await this.lti.rotateKeys();
    }
    async generateAiSummaries() {
        await this.aiAgents.generatePeriodicSummary();
    }
    async capturePerformanceSnapshot() {
        const snapshot = await this.performance.captureAggregate();
        this.logger.log(`Performance snapshot created (${snapshot.id})`);
    }
    async generateInstructorPayouts() {
        const batch = await this.instructorPayments.runDailyPayroll();
        this.logger.log(`Instructor payout batch generated (${batch.count} instructors).`);
    }
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
};
exports.AutomationService = AutomationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationService.prototype, "runMaintenanceTick", null);
__decorate([
    (0, schedule_1.Cron)('0 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationService.prototype, "rotateLtiKeys", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationService.prototype, "generateAiSummaries", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationService.prototype, "capturePerformanceSnapshot", null);
__decorate([
    (0, schedule_1.Cron)('0 3 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationService.prototype, "generateInstructorPayouts", null);
__decorate([
    (0, schedule_1.Cron)('0 4 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutomationService.prototype, "refreshValueScores", null);
exports.AutomationService = AutomationService = AutomationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [reports_service_1.ReportsService,
        certifications_service_1.CertificationsService,
        audit_service_1.AuditService,
        lti_service_1.LtiService,
        ai_agents_service_1.AiAgentsService,
        performance_service_1.PerformanceService,
        instructor_payments_service_1.InstructorPaymentsService,
        volunteer_content_service_1.VolunteerContentService,
        prisma_service_1.PrismaService])
], AutomationService);
//# sourceMappingURL=automation.service.js.map