import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(userId: string, courseId: string, tenantId = 'public') {
    return this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {},
      create: { userId, courseId, tenantId },
    });
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    if (!userId || !courseId) return false;
    const found = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { userId: true },
    });
    return !!found;
  }

  async myEnrollments(userId: string, tenantId = 'public') {
    return this.prisma.enrollment.findMany({
      where: { userId, tenantId },
      include: { Course: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async myHistory(userId: string, tenantId = 'public') {
    return this.prisma.enrollment.findMany({
      where: { userId, tenantId, completedAt: { not: null } },
      include: { Course: true },
      orderBy: { completedAt: 'desc' },
    });
  }

  async mySchedule(userId: string, tenantId = 'public') {
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

  async markComplete(enrollmentId: string, userId: string, role: string, tenantId = 'public') {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, tenantId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
      throw new ForbiddenException('Only admins or instructors can mark complete');
    }
    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { completedAt: new Date() },
    });
  }

  async markRefund(enrollmentId: string, userId: string, role: string, tenantId = 'public') {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, tenantId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can process refunds');
    }
    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { refundedAt: new Date() },
    });
  }
}
