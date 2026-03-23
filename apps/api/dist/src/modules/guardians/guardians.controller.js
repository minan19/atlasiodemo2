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
exports.GuardiansController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const roles_1 = require("../auth/roles");
const guardians_service_1 = require("./guardians.service");
let GuardiansController = class GuardiansController {
    constructor(service) {
        this.service = service;
    }
    linkStudent(dto, req) {
        const guardianId = req.user.id || req.user.userId;
        const tenantId = req.user.tenantId || req.tenantId || 'public';
        return this.service.linkStudent(guardianId, dto.studentEmail, tenantId);
    }
    getMyStudents(req) {
        const guardianId = req.user.id || req.user.userId;
        const tenantId = req.user.tenantId || req.tenantId || 'public';
        return this.service.getMyStudentsOverview(guardianId, tenantId);
    }
};
exports.GuardiansController = GuardiansController;
__decorate([
    (0, roles_1.Roles)('GUARDIAN', 'ADMIN'),
    (0, common_1.Post)('link-student'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], GuardiansController.prototype, "linkStudent", null);
__decorate([
    (0, roles_1.Roles)('GUARDIAN'),
    (0, common_1.Get)('my-students'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuardiansController.prototype, "getMyStudents", null);
exports.GuardiansController = GuardiansController = __decorate([
    (0, swagger_1.ApiTags)('guardians'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('guardians'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [guardians_service_1.GuardiansService])
], GuardiansController);
//# sourceMappingURL=guardians.controller.js.map