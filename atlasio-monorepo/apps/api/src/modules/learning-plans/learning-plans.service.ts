import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AuditService } from '../audit/audit.service';
import { AddCourseToLearningPlanDto, CreateLearningPlanDto } from './dto';

@Injectable()
export class LearningPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
    private readonly audit: AuditService,
  ) {}

  create(dto: CreateLearningPlanDto, actorId?: string) {
    return this.prisma.learningPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    }).then(async (plan: { id: string }) => {
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

  async addCourse(planId: string, dto: AddCourseToLearningPlanDto, actorId?: string) {
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

  async assign(planId: string, userId: string, actorId?: string) {
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
}
