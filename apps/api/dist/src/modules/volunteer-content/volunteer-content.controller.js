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
exports.VolunteerContentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const volunteer_content_service_1 = require("./volunteer-content.service");
const dto_1 = require("./dto");
let VolunteerContentController = class VolunteerContentController {
    constructor(service) {
        this.service = service;
    }
    create(dto, req) {
        const userId = req.user.id ?? req.user.userId;
        return this.service.create(dto, userId);
    }
    listMine(req) {
        const userId = req.user.id ?? req.user.userId;
        return this.service.listForInstructor(userId);
    }
    submitFeedback(id, dto, req) {
        const userId = req.user.id ?? req.user.userId;
        return this.service.addFeedback(id, dto, userId);
    }
    adminList(dto) {
        return this.service.listForAdmin({ status: dto.status });
    }
    updateStatus(id, dto, req) {
        const actorId = req.user.id ?? req.user.userId;
        return this.service.setStatus(id, dto, actorId);
    }
    myScore(req) {
        const userId = req.user.id ?? req.user.userId;
        return this.service.getLatestValueScore(userId);
    }
    instructorScores(instructorId) {
        return this.service.getInstructorScores(instructorId);
    }
    instructorScore(instructorId) {
        return this.service.getLatestValueScore(instructorId);
    }
    recordInstructorScores(instructorId, req) {
        const actorId = req.user.id ?? req.user.userId;
        return this.service.recordValueScore(instructorId, actorId);
    }
};
exports.VolunteerContentController = VolunteerContentController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_1.Roles)('INSTRUCTOR'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateVolunteerContentDto, Object]),
    __metadata("design:returntype", void 0)
], VolunteerContentController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_1.Roles)('INSTRUCTOR'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VolunteerContentController.prototype, "listMine", null);
__decorate([
    (0, common_1.Post)(':id/feedback'),
    (0, roles_1.Roles)('STUDENT', 'INSTRUCTOR'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateVolunteerFeedbackDto, Object]),
    __metadata("design:returntype", void 0)
], VolunteerContentController.prototype, "submitFeedback", null);
__decorate([
    (0, common_1.Get)('admin'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ListVolunteerContentQuery]),
    __metadata("design:returntype", void 0)
], VolunteerContentController.prototype, "adminList", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateVolunteerContentStatusDto, Object]),
    __metadata("design:returntype", void 0)
], VolunteerContentController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)('me/score'),
    (0, roles_1.Roles)('INSTRUCTOR'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VolunteerContentController.prototype, "myScore", null);
__decorate([
    (0, common_1.Get)('admin/:instructorId/scores'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('instructorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VolunteerContentController.prototype, "instructorScores", null);
__decorate([
    (0, common_1.Get)('admin/:instructorId/score'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('instructorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VolunteerContentController.prototype, "instructorScore", null);
__decorate([
    (0, common_1.Post)('admin/:instructorId/scores'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('instructorId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], VolunteerContentController.prototype, "recordInstructorScores", null);
exports.VolunteerContentController = VolunteerContentController = __decorate([
    (0, swagger_1.ApiTags)('volunteer-contents'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('volunteer-contents'),
    __metadata("design:paramtypes", [volunteer_content_service_1.VolunteerContentService])
], VolunteerContentController);
//# sourceMappingURL=volunteer-content.controller.js.map