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
exports.DepartmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const roles_1 = require("../auth/roles");
const departments_service_1 = require("./departments.service");
let DepartmentsController = class DepartmentsController {
    constructor(service) {
        this.service = service;
    }
    createDepartment(dto, req) {
        const tenantId = req.user.tenantId || req.tenantId || 'public';
        return this.service.createDepartment(tenantId, dto.name, dto.headInstructorId);
    }
    getMyDepartments(req) {
        const headInstructorId = req.user.id || req.user.userId;
        const tenantId = req.user.tenantId || req.tenantId || 'public';
        return this.service.getMyDepartments(headInstructorId, tenantId);
    }
    addInstructor(departmentId, dto, req) {
        const headInstructorId = req.user.id || req.user.userId;
        return this.service.addInstructorToDepartment(headInstructorId, departmentId, dto.instructorId);
    }
};
exports.DepartmentsController = DepartmentsController;
__decorate([
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "createDepartment", null);
__decorate([
    (0, roles_1.Roles)('HEAD_INSTRUCTOR'),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "getMyDepartments", null);
__decorate([
    (0, roles_1.Roles)('HEAD_INSTRUCTOR'),
    (0, common_1.Post)(':id/instructors'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "addInstructor", null);
exports.DepartmentsController = DepartmentsController = __decorate([
    (0, swagger_1.ApiTags)('departments'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('departments'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [departments_service_1.DepartmentsService])
], DepartmentsController);
//# sourceMappingURL=departments.controller.js.map