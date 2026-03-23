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
exports.EnrollmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EnrollmentsService = class EnrollmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enroll(userId, courseId, tenantId = 'public') {
        return this.prisma.enrollment.upsert({
            where: { userId_courseId: { userId, courseId } },
            update: {},
            create: { userId, courseId, tenantId },
        });
    }
    async isEnrolled(userId, courseId) {
        if (!userId || !courseId)
            return false;
        const found = await this.prisma.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId } },
            select: { userId: true },
        });
        return !!found;
    }
    async myEnrollments(userId, tenantId = 'public') {
        return this.prisma.enrollment.findMany({
            where: { userId, tenantId },
            include: { Course: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async myHistory(userId, tenantId = 'public') {
        return this.prisma.enrollment.findMany({
            where: { userId, tenantId, completedAt: { not: null } },
            include: { Course: true },
            orderBy: { completedAt: 'desc' },
        });
    }
    async mySchedule(userId, tenantId = 'public') {
        const enrollments = await this.prisma.enrollment.findMany({
            where: { userId, tenantId, completedAt: null, refundedAt: null },
            include: {
                Course: {
                    include: {
                        CourseSchedule: {
                            where: { startAt: { gte: new Date() } },
                            orderBy: { startAt: 'asc' },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return enrollments;
    }
    async markComplete(enrollmentId, userId, role, tenantId = 'public') {
        const enrollment = await this.prisma.enrollment.findFirst({
            where: { id: enrollmentId, tenantId },
        });
        if (!enrollment)
            throw new common_1.NotFoundException('Enrollment not found');
        if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
            throw new common_1.ForbiddenException('Only admins or instructors can mark complete');
        }
        return this.prisma.enrollment.update({
            where: { id: enrollmentId },
            data: { completedAt: new Date() },
        });
    }
    async markRefund(enrollmentId, userId, role, tenantId = 'public') {
        const enrollment = await this.prisma.enrollment.findFirst({
            where: { id: enrollmentId, tenantId },
        });
        if (!enrollment)
            throw new common_1.NotFoundException('Enrollment not found');
        if (role !== 'ADMIN') {
            throw new common_1.ForbiddenException('Only admins can process refunds');
        }
        return this.prisma.enrollment.update({
            where: { id: enrollmentId },
            data: { refundedAt: new Date() },
        });
    }
};
exports.EnrollmentsService = EnrollmentsService;
exports.EnrollmentsService = EnrollmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EnrollmentsService);
//# sourceMappingURL=enrollments.service.js.map