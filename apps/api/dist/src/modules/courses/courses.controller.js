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
exports.CoursesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const dto_1 = require("./dto");
const courses_service_1 = require("./courses.service");
let CoursesController = class CoursesController {
    constructor(courses) {
        this.courses = courses;
    }
    listPublished(req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.courses.listPublished(tenantId);
    }
    getPublished(id, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.courses.getPublished(id, tenantId);
    }
    getSchedule(id, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.courses.listSchedule(id, tenantId);
    }
    listAll(req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.courses.listAll(tenantId);
    }
    create(dto, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.courses.create(dto, req.user.id ?? req.user.userId, tenantId);
    }
    addSchedule(id, dto, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.courses.addSchedule(id, dto, req.user.id ?? req.user.userId, req.user.role ?? req.user.roles?.[0], tenantId);
    }
    async downloadIcs(id, req, res) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        const ics = await this.courses.scheduleIcs(id, tenantId);
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="course-${id}-schedule.ics"`);
        return res.send(ics);
    }
    publish(id, dto, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.courses.publish(id, dto.isPublished, req.user.id ?? req.user.userId, tenantId);
    }
};
exports.CoursesController = CoursesController;
__decorate([
    (0, common_1.Get)('published'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "listPublished", null);
__decorate([
    (0, common_1.Get)('published/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "getPublished", null);
__decorate([
    (0, common_1.Get)(':id/schedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "getSchedule", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "listAll", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateCourseDto, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)(':id/schedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateCourseScheduleDto, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "addSchedule", null);
__decorate([
    (0, common_1.Get)(':id/schedule/ics'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CoursesController.prototype, "downloadIcs", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Patch)(':id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.PublishCourseDto, Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "publish", null);
exports.CoursesController = CoursesController = __decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiTags)('courses'),
    (0, common_1.Controller)('courses'),
    __metadata("design:paramtypes", [courses_service_1.CoursesService])
], CoursesController);
//# sourceMappingURL=courses.controller.js.map