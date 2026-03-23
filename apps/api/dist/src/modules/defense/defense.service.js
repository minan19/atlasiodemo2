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
exports.DefenseService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let DefenseService = class DefenseService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createEvent(dto) {
        const data = {
            id: (0, crypto_1.randomUUID)(),
            source: dto.source,
            category: dto.category,
            eventType: dto.eventType,
            severity: dto.severity ?? client_1.SecurityEventSeverity.MEDIUM,
            status: dto.status ?? client_1.SecurityEventStatus.OPEN,
            description: dto.description,
            actorIp: dto.actorIp,
            userAgent: dto.userAgent,
            payload: dto.payload === undefined
                ? undefined
                : dto.payload,
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
    async createAction(dto) {
        const data = {
            id: (0, crypto_1.randomUUID)(),
            actionType: dto.actionType,
            target: dto.target,
            params: dto.params === undefined
                ? undefined
                : dto.params,
            state: dto.state ?? client_1.DefenseActionState.PROPOSED,
            reason: dto.reason,
            createdBy: dto.createdBy ?? 'atlasio-ai',
            SecurityEvent: dto.eventId ? { connect: { id: dto.eventId } } : undefined,
        };
        return this.prisma.defenseAction.create({ data });
    }
    async updateActionState(id, state, reason) {
        return this.prisma.defenseAction.update({
            where: { id },
            data: {
                state,
                reason,
                appliedAt: state === client_1.DefenseActionState.APPLIED ? new Date() : undefined,
                rolledBackAt: state === client_1.DefenseActionState.ROLLED_BACK ? new Date() : undefined,
            },
        });
    }
};
exports.DefenseService = DefenseService;
exports.DefenseService = DefenseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DefenseService);
//# sourceMappingURL=defense.service.js.map