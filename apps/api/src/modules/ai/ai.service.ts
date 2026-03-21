import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LearningEventType, RecommendationType } from '@prisma/client';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async recordLearningEvent(payload: { tenantId: string; userId?: string; eventType: LearningEventType; payload?: Record<string, any> }) {
    const event = await this.prisma.learningEvent.create({ data: payload });
    await this.audit.log({
      action: 'learningEvent.record',
      entity: 'LearningEvent',
      entityId: event.id,
      actorId: payload.userId,
      meta: { type: payload.eventType },
    });
    return event;
  }

  async proposeRecommendation(tenantId: string, userId: string, type: RecommendationType, payload: Record<string, any>, reason: string) {
    const recommendation = await this.prisma.recommendation.create({
      data: {
        tenantId,
        userId,
        type,
        payload,
        reason,
        score: 0,
        explainedBy: 'heuristic',
      },
    });
    await this.audit.log({
      action: 'recommendation.create',
      entity: 'Recommendation',
      entityId: recommendation.id,
      actorId: userId,
      meta: { reason },
    });
    return recommendation;
  }

  async getRecommendations(tenantId: string, filters: { userId?: string; courseId?: string }) {
    return this.prisma.recommendation.findMany({
      where: {
        tenantId,
        userId: filters.userId,
        payload: filters.courseId ? { path: ['courseId'], equals: filters.courseId } : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async logMetric(tenantId: string, name: string, resource: string, value: number, metadata?: Record<string, any>) {
    return this.prisma.aIMetric.create({
      data: {
        tenantId,
        name,
        resource,
        value,
        metadata,
      },
    });
  }
}
