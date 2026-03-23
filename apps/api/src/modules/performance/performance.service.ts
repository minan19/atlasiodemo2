import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async captureAggregate(actorId?: string) {
    const now = new Date();
    const [enrollmentCount, activeCourses, lessonCount, aiLogsLastHour, ltiLaunches24h] = await Promise.all([
      this.prisma.enrollment.count(),
      this.prisma.course.count({ where: { isPublished: true } }),
      this.prisma.lessonContent.count(),
      this.prisma.aiAgentLog.count({ where: { createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } }),
      this.prisma.ltiLaunch.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);

    const metrics = {
      enrollmentCount,
      activeCourses,
      lessonCount,
      aiLogsLastHour,
      ltiLaunches24h,
      recordedAt: now.toISOString(),
    };

    const snapshot = await this.prisma.performanceSnapshot.create({
      data: {
        id: randomUUID(),
        userId: actorId ?? null,
        context: 'automation:aggregate',
        metrics,
        notes: 'Scheduled performance capture',
      },
    });

    await this.audit.log({
      action: 'performance.snapshot',
      entity: 'PerformanceSnapshot',
      entityId: snapshot.id,
      actorId,
      meta: { metrics },
    });

    return snapshot;
  }

  async list(limit = 20) {
    const snapshots = await this.prisma.performanceSnapshot.findMany({
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
    return snapshots;
  }
}
