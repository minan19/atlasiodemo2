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
exports.AiAgentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const crypto_1 = require("crypto");
let AiAgentsService = class AiAgentsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async listForUser(userId) {
        const agents = await this.prisma.aiAgentProfile.findMany({
            where: { OR: [{ userId }, { userId: null }] },
            include: { AiAgentLog: { orderBy: { createdAt: 'desc' }, take: 3 } },
        });
        return agents;
    }
    async executeAgent(agentId, userId) {
        const agent = await this.prisma.aiAgentProfile.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new common_1.NotFoundException('Agent not found');
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
    async getLogs(agentId) {
        return this.prisma.aiAgentLog.findMany({
            where: { agentId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }
    async addContext(agentId, dto) {
        const agent = await this.prisma.aiAgentProfile.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new common_1.NotFoundException('Agent not found');
        const existing = agent.contextMap ?? {};
        const merged = { ...existing, [dto.key]: dto.value };
        await this.prisma.aiAgentProfile.update({
            where: { id: agentId },
            data: { contextMap: merged },
        });
        await this.prisma.aiAgentLog.create({
            data: { agentId, type: 'CONTEXT_UPDATE', payload: merged },
        });
        return merged;
    }
    async addFeedback(agentId, dto, userId) {
        await this.prisma.aiAgentLog.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                agentId,
                type: 'FEEDBACK',
                payload: dto,
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
    async ensureAssistantAgent(userId) {
        const agent = await this.prisma.aiAgentProfile.findFirst({ where: { name: 'Atlasio Assistant' } });
        if (agent)
            return agent;
        return this.prisma.aiAgentProfile.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
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
            data: { id: (0, crypto_1.randomUUID)(), agentId: agent.id, type: 'SUMMARY', payload: summary },
        });
        await this.audit.log({ action: 'ai.agent.summary', entity: 'AiAgentProfile', entityId: agent.id });
        return summary;
    }
};
exports.AiAgentsService = AiAgentsService;
exports.AiAgentsService = AiAgentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], AiAgentsService);
//# sourceMappingURL=ai-agents.service.js.map