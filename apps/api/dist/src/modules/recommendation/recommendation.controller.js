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
exports.RecommendationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const recommendation_service_1 = require("./recommendation.service");
let RecommendationController = class RecommendationController {
    constructor(recs) {
        this.recs = recs;
    }
    async myProfile(req) {
        const userId = req.user?.id ?? req.user?.userId;
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.recs.computeStudentProfile(userId, tenantId);
    }
    async myRecommendations(req, limit) {
        const userId = req.user?.id ?? req.user?.userId;
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.recs.getUserRecommendations(userId, tenantId, limit ? parseInt(limit, 10) : 10);
    }
    async studentProfile(userId, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.recs.computeStudentProfile(userId, tenantId);
    }
    async computeStudentProfile(userId, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.recs.computeStudentProfile(userId, tenantId);
    }
    async contentInsights(req, courseId) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.recs.getContentInsights(tenantId, courseId);
    }
    async atRiskStudents(req, threshold, limit) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.recs.getAtRiskStudents(tenantId, threshold ? parseInt(threshold, 10) : 70, limit ? parseInt(limit, 10) : 20);
    }
};
exports.RecommendationController = RecommendationController;
__decorate([
    (0, common_1.Get)('me/profile'),
    (0, roles_1.Roles)('STUDENT', 'INSTRUCTOR', 'ADMIN'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "myProfile", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_1.Roles)('STUDENT', 'INSTRUCTOR', 'ADMIN'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "myRecommendations", null);
__decorate([
    (0, common_1.Get)('students/:userId/profile'),
    (0, roles_1.Roles)('INSTRUCTOR', 'ADMIN'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "studentProfile", null);
__decorate([
    (0, common_1.Post)('students/:userId/compute'),
    (0, roles_1.Roles)('INSTRUCTOR', 'ADMIN'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "computeStudentProfile", null);
__decorate([
    (0, common_1.Get)('content-insights'),
    (0, roles_1.Roles)('INSTRUCTOR', 'ADMIN'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('courseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "contentInsights", null);
__decorate([
    (0, common_1.Get)('at-risk'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('threshold')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RecommendationController.prototype, "atRiskStudents", null);
exports.RecommendationController = RecommendationController = __decorate([
    (0, swagger_1.ApiTags)('recommendations'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('recommendations'),
    __metadata("design:paramtypes", [recommendation_service_1.RecommendationService])
], RecommendationController);
//# sourceMappingURL=recommendation.controller.js.map