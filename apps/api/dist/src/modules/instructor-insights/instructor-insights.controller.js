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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstructorInsightsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const instructor_insights_service_1 = require("./instructor-insights.service");
const class_insights_query_dto_1 = require("./dto/class-insights.query.dto");
const student_insights_query_dto_1 = require("./dto/student-insights.query.dto");
const create_action_dto_1 = require("./dto/create-action.dto");
const list_actions_query_dto_1 = require("./dto/list-actions.query.dto");
const update_action_dto_1 = require("./dto/update-action.dto");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const common_2 = require("@nestjs/common");
let InstructorInsightsController = class InstructorInsightsController {
    constructor(service) {
        this.service = service;
    }
    async getClassInsights(classId, query, req) {
        const window = query.window ?? '30d';
        return this.service.getClassInsights({
            classId,
            window,
            requester: { id: req.user?.id ?? req.user?.userId, role: req.user?.role, tenantId: req.user?.tenantId },
        });
    }
    async getStudentInsights(classId, studentId, query, req) {
        const window = query.window ?? '30d';
        return this.service.getStudentInsights({
            classId,
            studentId,
            window,
            requester: { id: req.user?.id ?? req.user?.userId, role: req.user?.role, tenantId: req.user?.tenantId },
        });
    }
    async createAction(dto, req) {
        return this.service.createInstructorAction({
            dto,
            requester: { id: req.user?.id ?? req.user?.userId, role: req.user?.role, tenantId: req.user?.tenantId },
        });
    }
    async listActions(query, req) {
        return this.service.listInstructorActions({
            query,
            requester: { id: req.user?.id ?? req.user?.userId, role: req.user?.role, tenantId: req.user?.tenantId },
        });
    }
    async updateAction(actionId, dto, req) {
        return this.service.updateInstructorAction({
            actionId,
            dto,
            requester: { id: req.user?.id ?? req.user?.userId, role: req.user?.role, tenantId: req.user?.tenantId },
        });
    }
};
exports.InstructorInsightsController = InstructorInsightsController;
__decorate([
    (0, common_1.Get)('classes/:classId/insights'),
    __param(0, (0, common_1.Param)('classId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, class_insights_query_dto_1.ClassInsightsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], InstructorInsightsController.prototype, "getClassInsights", null);
__decorate([
    (0, common_1.Get)('classes/:classId/students/:studentId/insights'),
    __param(0, (0, common_1.Param)('classId')),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, student_insights_query_dto_1.StudentInsightsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], InstructorInsightsController.prototype, "getStudentInsights", null);
__decorate([
    (0, common_2.Post)('actions'),
    __param(0, (0, common_2.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_action_dto_1.CreateInstructorActionDto, Object]),
    __metadata("design:returntype", Promise)
], InstructorInsightsController.prototype, "createAction", null);
__decorate([
    (0, common_1.Get)('actions'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_actions_query_dto_1.ListActionsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], InstructorInsightsController.prototype, "listActions", null);
__decorate([
    (0, common_2.Patch)('actions/:actionId'),
    __param(0, (0, common_1.Param)('actionId')),
    __param(1, (0, common_2.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_action_dto_1.UpdateInstructorActionDto, Object]),
    __metadata("design:returntype", Promise)
], InstructorInsightsController.prototype, "updateAction", null);
exports.InstructorInsightsController = InstructorInsightsController = __decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiTags)('instructor-insights'),
    (0, common_1.Controller)('instructor'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('instructor', 'admin'),
    __metadata("design:paramtypes", [instructor_insights_service_1.InstructorInsightsService])
], InstructorInsightsController);
//# sourceMappingURL=instructor-insights.controller.js.map