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
exports.EnrollmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const enrollments_service_1 = require("./enrollments.service");
let EnrollmentsController = class EnrollmentsController {
    constructor(enrollments) {
        this.enrollments = enrollments;
    }
    enroll(courseId, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.enrollments.enroll(req.user.id ?? req.user.userId, courseId, tenantId);
    }
    my(req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.enrollments.myEnrollments(req.user.id ?? req.user.userId, tenantId);
    }
    myHistory(req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.enrollments.myHistory(req.user.id ?? req.user.userId, tenantId);
    }
    mySchedule(req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.enrollments.mySchedule(req.user.id ?? req.user.userId, tenantId);
    }
    complete(id, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.enrollments.markComplete(id, req.user.id ?? req.user.userId, req.user.role ?? req.user.roles?.[0], tenantId);
    }
    refund(id, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.enrollments.markRefund(id, req.user.id ?? req.user.userId, req.user.role ?? req.user.roles?.[0], tenantId);
    }
};
exports.EnrollmentsController = EnrollmentsController;
__decorate([
    (0, common_1.Post)('courses/:courseId/enroll'),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "enroll", null);
__decorate([
    (0, common_1.Get)('me/enrollments'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "my", null);
__decorate([
    (0, common_1.Get)('me/history'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "myHistory", null);
__decorate([
    (0, common_1.Get)('me/schedule'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "mySchedule", null);
__decorate([
    (0, common_1.Patch)('enrollments/:id/complete'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "complete", null);
__decorate([
    (0, common_1.Patch)('enrollments/:id/refund'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "refund", null);
exports.EnrollmentsController = EnrollmentsController = __decorate([
    (0, swagger_1.ApiTags)('enrollments'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [enrollments_service_1.EnrollmentsService])
], EnrollmentsController);
//# sourceMappingURL=enrollments.controller.js.map