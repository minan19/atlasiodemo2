"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstructorInsightsModule = void 0;
const common_1 = require("@nestjs/common");
const instructor_insights_controller_1 = require("./instructor-insights.controller");
const instructor_insights_service_1 = require("./instructor-insights.service");
const prisma_module_1 = require("../prisma/prisma.module");
const infra_module_1 = require("../../infra/infra.module");
const instructor_insights_cache_1 = require("./instructor-insights.cache");
const me_actions_controller_1 = require("./me-actions.controller");
let InstructorInsightsModule = class InstructorInsightsModule {
};
exports.InstructorInsightsModule = InstructorInsightsModule;
exports.InstructorInsightsModule = InstructorInsightsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, infra_module_1.InfraModule],
        controllers: [instructor_insights_controller_1.InstructorInsightsController, me_actions_controller_1.MeActionsController],
        providers: [instructor_insights_service_1.InstructorInsightsService, instructor_insights_cache_1.InstructorInsightsCache],
        exports: [instructor_insights_service_1.InstructorInsightsService, instructor_insights_cache_1.InstructorInsightsCache],
    })
], InstructorInsightsModule);
//# sourceMappingURL=instructor-insights.module.js.map