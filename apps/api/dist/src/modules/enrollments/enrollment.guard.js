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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const enrollments_service_1 = require("./enrollments.service");
let EnrollmentGuard = class EnrollmentGuard {
    constructor(enrollments, prisma) {
        this.enrollments = enrollments;
        this.prisma = prisma;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const userId = req.user?.id ?? req.user?.userId;
        const role = req.user?.role;
        const courseId = req.params?.courseId;
        const lessonId = req.params?.lessonId;
        if (role === 'ADMIN')
            return true;
        if (lessonId) {
            const lesson = await this.prisma.lessonContent.findUnique({ where: { id: lessonId } });
            if (lesson?.isPreview)
                return true;
        }
        const ok = await this.enrollments.isEnrolled(userId, courseId);
        if (!ok)
            throw new common_1.ForbiddenException('You are not enrolled in this course');
        return true;
    }
};
exports.EnrollmentGuard = EnrollmentGuard;
exports.EnrollmentGuard = EnrollmentGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [enrollments_service_1.EnrollmentsService,
        prisma_service_1.PrismaService])
], EnrollmentGuard);
//# sourceMappingURL=enrollment.guard.js.map