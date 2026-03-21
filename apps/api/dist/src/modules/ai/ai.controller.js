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
exports.AIModuleController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const ai_service_1 = require("./ai.service");
class LearningEventDto {
}
class RecommendationDto {
}
class RecommendationQueryDto {
}
let AIModuleController = class AIModuleController {
    constructor(ai) {
        this.ai = ai;
    }
    recordEvent(dto, req) {
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.user.id ?? req.user.userId;
        return this.ai.recordLearningEvent({ tenantId, userId, eventType: dto.eventType, payload: dto.payload });
    }
    createRecommendation(dto, req) {
        const tenantId = req.headers['x-tenant-id'];
        const userId = req.user.id ?? req.user.userId;
        return this.ai.proposeRecommendation(tenantId, userId, dto.type, dto.payload, dto.reason);
    }
    getRecommendations(dto, req) {
        const tenantId = req.headers['x-tenant-id'];
        return this.ai.getRecommendations(tenantId, { userId: dto.userId, courseId: dto.courseId });
    }
};
exports.AIModuleController = AIModuleController;
__decorate([
    (0, common_1.Post)('events'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR', 'STUDENT'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LearningEventDto, Object]),
    __metadata("design:returntype", void 0)
], AIModuleController.prototype, "recordEvent", null);
__decorate([
    (0, common_1.Post)('recommendations'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RecommendationDto, Object]),
    __metadata("design:returntype", void 0)
], AIModuleController.prototype, "createRecommendation", null);
__decorate([
    (0, common_1.Get)('recommendations'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RecommendationQueryDto, Object]),
    __metadata("design:returntype", void 0)
], AIModuleController.prototype, "getRecommendations", null);
exports.AIModuleController = AIModuleController = __decorate([
    (0, swagger_1.ApiTags)('ai'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [ai_service_1.AIService])
], AIModuleController);
//# sourceMappingURL=ai.controller.js.map