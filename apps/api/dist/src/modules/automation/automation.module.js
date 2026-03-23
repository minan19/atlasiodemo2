"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationModule = void 0;
const common_1 = require("@nestjs/common");
const automation_service_1 = require("./automation.service");
const reports_module_1 = require("../reports/reports.module");
const certifications_module_1 = require("../certifications/certifications.module");
const audit_module_1 = require("../audit/audit.module");
const lti_module_1 = require("../lti/lti.module");
const ai_agents_module_1 = require("../ai-agents/ai-agents.module");
const performance_module_1 = require("../performance/performance.module");
const live_module_1 = require("../live/live.module");
const instructor_payments_module_1 = require("../instructor-payments/instructor-payments.module");
const volunteer_content_module_1 = require("../volunteer-content/volunteer-content.module");
const prisma_module_1 = require("../prisma/prisma.module");
let AutomationModule = class AutomationModule {
};
exports.AutomationModule = AutomationModule;
exports.AutomationModule = AutomationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            reports_module_1.ReportsModule,
            certifications_module_1.CertificationsModule,
            audit_module_1.AuditModule,
            lti_module_1.LtiModule,
            ai_agents_module_1.AiAgentsModule,
            performance_module_1.PerformanceModule,
            live_module_1.LiveModule,
            instructor_payments_module_1.InstructorPaymentsModule,
            volunteer_content_module_1.VolunteerContentModule,
            prisma_module_1.PrismaModule,
        ],
        providers: [automation_service_1.AutomationService],
    })
], AutomationModule);
//# sourceMappingURL=automation.module.js.map