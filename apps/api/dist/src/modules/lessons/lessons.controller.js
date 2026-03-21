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
exports.LessonsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const lessons_service_1 = require("./lessons.service");
const create_lesson_dto_1 = require("./dto/create-lesson.dto");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const enrollment_guard_1 = require("../enrollments/enrollment.guard");
let LessonsController = class LessonsController {
    constructor(lessons) {
        this.lessons = lessons;
    }
    create(courseId, body) {
        return this.lessons.create(courseId, body);
    }
    list(courseId) {
        return this.lessons.listByCourse(courseId);
    }
    get(courseId, lessonId) {
        return this.lessons.get(courseId, lessonId);
    }
    complete(courseId, lessonId, req) {
        const userId = req.user.id ?? req.user.userId;
        return this.lessons.markComplete(userId, courseId, lessonId);
    }
    progress(courseId, req) {
        const userId = req.user.id ?? req.user.userId;
        return this.lessons.courseProgress(userId, courseId);
    }
    bulkProgress(body, req) {
        const userId = req.user.id ?? req.user.userId;
        return this.lessons.allProgress(userId, body.courseIds ?? []);
    }
};
exports.LessonsController = LessonsController;
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)('courses/:courseId/lessons'),
    (0, swagger_1.ApiBody)({ type: create_lesson_dto_1.CreateLessonDto }),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_lesson_dto_1.CreateLessonDto]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), enrollment_guard_1.EnrollmentGuard),
    (0, common_1.Get)('courses/:courseId/lessons'),
    __param(0, (0, common_1.Param)('courseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "list", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), enrollment_guard_1.EnrollmentGuard),
    (0, common_1.Get)('courses/:courseId/lessons/:lessonId'),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, common_1.Param)('lessonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "get", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('courses/:courseId/lessons/:lessonId/complete'),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, common_1.Param)('lessonId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "complete", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('courses/:courseId/progress'),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "progress", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('me/progress/bulk'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LessonsController.prototype, "bulkProgress", null);
exports.LessonsController = LessonsController = __decorate([
    (0, swagger_1.ApiTags)('lessons'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [lessons_service_1.LessonsService])
], LessonsController);
//# sourceMappingURL=lessons.controller.js.map