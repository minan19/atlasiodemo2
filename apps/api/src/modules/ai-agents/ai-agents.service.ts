import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiAgentFeedbackDto, AiContextDto } from './dto';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class AiAgentsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async listForUser(userId: string) {
    const agents = await this.prisma.aiAgentProfile.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      include: { AiAgentLog: { orderBy: { createdAt: 'desc' }, take: 3 } },
    });
    return agents;
  }

  async executeAgent(agentId: string, userId: string) {
    const agent = await this.prisma.aiAgentProfile.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    const result = {
      summary: `Agent ${agent.name} üretildi (user=${userId}).`,
      recommendations: ['Kurs özetini oku', 'Yeni quiz oluştur', 'Mikrolearning gönder'],
      timestamp: new Date().toISOString(),
    };
    await this.prisma.aiAgentLog.create({
      data: {
        agentId,
        type: 'EXECUTE',
        payload: result,
      },
    });
    await this.audit.log({
      action: 'ai.agent.execute',
      entity: 'AiAgentProfile',
      entityId: agentId,
      meta: { userId, recommendations: result.recommendations },
    });
    await this.prisma.aiAgentProfile.update({
      where: { id: agentId },
      data: { lastActivity: new Date() },
    });
    return result;
  }

  async getLogs(agentId: string) {
    return this.prisma.aiAgentLog.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async addContext(agentId: string, dto: AiContextDto) {
    const agent = await this.prisma.aiAgentProfile.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    const existing = (agent.contextMap as Record<string, unknown>) ?? {};
    const merged = { ...existing, [dto.key]: dto.value };
    await this.prisma.aiAgentProfile.update({
      where: { id: agentId },
      data: { contextMap: merged as any },
    });
    await this.prisma.aiAgentLog.create({
      data: { agentId, type: 'CONTEXT_UPDATE', payload: merged as Prisma.InputJsonValue },
    });
    return merged;
  }

  async addFeedback(agentId: string, dto: AiAgentFeedbackDto, userId: string) {
    await this.prisma.aiAgentLog.create({
      data: {
        id: randomUUID(),
        agentId,
        type: 'FEEDBACK',
        payload: dto as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      action: 'ai.agent.feedback',
      entity: 'AiAgentProfile',
      entityId: agentId,
      meta: { ...dto, userId },
    });
    return { ok: true };
  }

  async ensureAssistantAgent(userId?: string) {
    const agent = await this.prisma.aiAgentProfile.findFirst({ where: { name: 'Atlasio Assistant' } });
    if (agent) return agent;
    return this.prisma.aiAgentProfile.create({
      data: {
        id: randomUUID(),
        name: 'Atlasio Assistant',
        contextMap: { domain: 'atlasio' },
        status: 'ACTIVE',
        userId: userId ?? null,
      },
    });
  }

  async generatePeriodicSummary() {
    const agent = await this.ensureAssistantAgent();
    const summary = {
      message: 'Haftalık özet hazırlandı',
      generatedAt: new Date().toISOString(),
    };
    await this.prisma.aiAgentLog.create({
      data: { id: randomUUID(), agentId: agent.id, type: 'SUMMARY', payload: summary },
    });
    await this.audit.log({ action: 'ai.agent.summary', entity: 'AiAgentProfile', entityId: agent.id });
    return summary;
  }
}
