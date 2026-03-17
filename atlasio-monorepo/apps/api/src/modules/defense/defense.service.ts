import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DefenseActionState,
  DefenseActionType,
  Prisma,
  SecurityEventSeverity,
  SecurityEventStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDefenseActionDto,
  CreateSecurityEventDto,
} from './dto/create-security-event.dto';

@Injectable()
export class DefenseService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(dto: CreateSecurityEventDto) {
    const data: Prisma.SecurityEventCreateInput = {
      id: randomUUID(),
      source: dto.source,
      category: dto.category,
      eventType: dto.eventType,
      severity: dto.severity ?? SecurityEventSeverity.MEDIUM,
      status: dto.status ?? SecurityEventStatus.OPEN,
      description: dto.description,
      actorIp: dto.actorIp,
      userAgent: dto.userAgent,
      payload:
        dto.payload === undefined
          ? undefined
          : (dto.payload as Prisma.InputJsonValue),
      Tenant: dto.tenantId ? { connect: { id: dto.tenantId } } : undefined,
    };
    return this.prisma.securityEvent.create({ data });
  }

  async listEvents(limit = 50) {
    return this.prisma.securityEvent.findMany({
      orderBy: { detectedAt: 'desc' },
      take: limit,
      include: { DefenseAction: true },
    });
  }

  async createAction(dto: CreateDefenseActionDto) {
    const data: Prisma.DefenseActionCreateInput = {
      id: randomUUID(),
      actionType: dto.actionType,
      target: dto.target,
      params:
        dto.params === undefined
          ? undefined
          : (dto.params as Prisma.InputJsonValue),
      state: dto.state ?? DefenseActionState.PROPOSED,
      reason: dto.reason,
      createdBy: dto.createdBy ?? 'atlasio-ai',
      SecurityEvent: dto.eventId ? { connect: { id: dto.eventId } } : undefined,
    };
    return this.prisma.defenseAction.create({ data });
  }

  async updateActionState(id: string, state: DefenseActionState, reason?: string) {
    return this.prisma.defenseAction.update({
      where: { id },
      data: {
        state,
        reason,
        appliedAt: state === DefenseActionState.APPLIED ? new Date() : undefined,
        rolledBackAt: state === DefenseActionState.ROLLED_BACK ? new Date() : undefined,
      },
    });
  }
}
