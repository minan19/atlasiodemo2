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
var AIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let AIService = AIService_1 = class AIService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
        this.logger = new common_1.Logger(AIService_1.name);
    }
    async recordLearningEvent(payload) {
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
    async proposeRecommendation(tenantId, userId, type, payload, reason) {
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
    async getRecommendations(tenantId, filters) {
        return this.prisma.recommendation.findMany({
            where: {
                tenantId,
                userId: filters.userId,
                payload: filters.courseId ? { path: ['courseId'], equals: filters.courseId } : undefined,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async logMetric(tenantId, name, resource, value, metadata) {
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
};
exports.AIService = AIService;
exports.AIService = AIService = AIService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], AIService);
//# sourceMappingURL=ai.service.js.map