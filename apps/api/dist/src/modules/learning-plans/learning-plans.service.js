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
exports.LearningPlansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const enrollments_service_1 = require("../enrollments/enrollments.service");
const audit_service_1 = require("../audit/audit.service");
let LearningPlansService = class LearningPlansService {
    constructor(prisma, enrollments, audit) {
        this.prisma = prisma;
        this.enrollments = enrollments;
        this.audit = audit;
    }
    create(dto, actorId) {
        return this.prisma.learningPlan.create({
            data: {
                name: dto.name,
                description: dto.description,
            },
        }).then(async (plan) => {
            await this.audit.log({
                actorId,
                action: 'learningPlan.create',
                entity: 'LearningPlan',
                entityId: plan.id,
            });
            return plan;
        });
    }
    list() {
        return this.prisma.learningPlan.findMany({
            include: { LearningPlanCourse: { include: { Course: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addCourse(planId, dto, actorId) {
        const row = await this.prisma.learningPlanCourse.upsert({
            where: { learningPlanId_courseId: { learningPlanId: planId, courseId: dto.courseId } },
            update: {},
            create: { learningPlanId: planId, courseId: dto.courseId },
        });
        await this.audit.log({
            actorId,
            action: 'learningPlan.addCourse',
            entity: 'LearningPlan',
            entityId: planId,
            meta: { courseId: dto.courseId },
        });
        return row;
    }
    async assign(planId, userId, actorId) {
        const planCourses = await this.prisma.learningPlanCourse.findMany({
            where: { learningPlanId: planId },
            select: { courseId: true },
        });
        for (const item of planCourses) {
            await this.enrollments.enroll(userId, item.courseId);
        }
        await this.audit.log({
            actorId,
            action: 'learningPlan.assign',
            entity: 'LearningPlan',
            entityId: planId,
            meta: { userId, enrolledCourses: planCourses.length },
        });
        return { planId, userId, enrolledCourses: planCourses.length };
    }
};
exports.LearningPlansService = LearningPlansService;
exports.LearningPlansService = LearningPlansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        enrollments_service_1.EnrollmentsService,
        audit_service_1.AuditService])
], LearningPlansService);
//# sourceMappingURL=learning-plans.service.js.map