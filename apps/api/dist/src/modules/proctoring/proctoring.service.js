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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProctoringService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const dto_1 = require("./dto");
const crypto_1 = require("crypto");
const ioredis_1 = require("@nestjs-modules/ioredis");
const proctoring_nosql_1 = require("./proctoring.nosql");
let ProctoringService = class ProctoringService {
    constructor(prisma, redis, nosql = new proctoring_nosql_1.ProctoringNoSqlWriter()) {
        this.prisma = prisma;
        this.redis = redis;
        this.nosql = nosql;
    }
    async startSession(userId, dto) {
        const session = await this.prisma.examSession.create({
            data: {
                userId,
                courseId: dto.courseId,
                deviceInfo: { startedAt: new Date().toISOString(), requestId: (0, crypto_1.randomUUID)() },
            },
        });
        await this.redis.hset(this.redisKey(session.id), {
            eye: 1,
            head: 1,
            audio: 1,
            tab: 1,
            object: 1,
        });
        await this.redis.expire(this.redisKey(session.id), 60 * 60);
        return { sessionId: session.id };
    }
    redisKey(sessionId) {
        return `proctor:session:${sessionId}`;
    }
    computeTrustScore(state) {
        const weights = { eye: 0.3, head: 0.2, audio: 0.2, tab: 0.2, object: 0.1 };
        let score = 1;
        if (state.eye !== undefined)
            score *= 1 - (1 - (state.eye ?? 1)) * weights.eye;
        if (state.head !== undefined)
            score *= 1 - (1 - (state.head ?? 1)) * weights.head;
        if (state.audio !== undefined)
            score *= 1 - (1 - (state.audio ?? 1)) * weights.audio;
        if (state.tab !== undefined)
            score *= 1 - (1 - (state.tab ?? 1)) * weights.tab;
        if (state.object !== undefined)
            score *= 1 - (1 - (state.object ?? 1)) * weights.object;
        return Math.max(0, Math.min(1, score));
    }
    async ingestEvent(userId, dto) {
        const session = await this.prisma.examSession.findUnique({ where: { id: dto.sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        const redisKey = this.redisKey(dto.sessionId);
        void this.nosql.writeLog({
            sessionId: dto.sessionId,
            ts: new Date().toISOString(),
            eventType: dto.type,
            confidence: dto.score,
            value: dto.value,
            flags: dto.flags,
        });
        await this.prisma.aiProctoringResult.create({
            data: {
                sessionId: dto.sessionId,
                eyeScore: dto.type === dto_1.ProctorEventType.EYE ? dto.score : undefined,
                headScore: dto.type === dto_1.ProctorEventType.HEAD ? dto.score : undefined,
                audioScore: dto.type === dto_1.ProctorEventType.AUDIO ? dto.score : undefined,
                tabSwitches: dto.type === dto_1.ProctorEventType.TAB ? Math.round(dto.value ?? 0) : undefined,
                objectFlags: dto.type === dto_1.ProctorEventType.OBJECT ? Math.round((dto.value ?? 0)) : undefined,
                finalTrustScore: undefined,
                aiRecommendation: undefined,
            },
        });
        const last = await this.prisma.aiProctoringResult.findMany({
            where: { sessionId: dto.sessionId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        const state = {};
        for (const row of last) {
            if (row.eyeScore !== null && row.eyeScore !== undefined)
                state.eye = row.eyeScore;
            if (row.headScore !== null && row.headScore !== undefined)
                state.head = row.headScore;
            if (row.audioScore !== null && row.audioScore !== undefined)
                state.audio = row.audioScore;
            if (row.tabSwitches !== null && row.tabSwitches !== undefined) {
                state.tab = Math.max(0, 1 - Math.min(1, row.tabSwitches / 5));
            }
            if (row.objectFlags !== null && row.objectFlags !== undefined) {
                state.object = row.objectFlags > 0 ? 0.2 : 1;
            }
        }
        const trust = this.computeTrustScore(state);
        await this.prisma.examSession.update({
            where: { id: dto.sessionId },
            data: { trustScore: trust },
        });
        await this.redis.hset(this.redisKey(dto.sessionId), { trust });
        await this.redis.hset(redisKey, { lastEvent: Date.now() });
        if (trust < 0.5) {
            await this.redis.hset(redisKey, { alert: 1 });
            await this.prisma.examSession.update({
                where: { id: dto.sessionId },
                data: {
                    aiDecision: 'SUSPICIOUS',
                    proctorNote: 'Yapay Zeka gözetmeni olağandışı aktivite (kopya şüphesi) tespit etti.'
                }
            });
        }
        return { trustScore: trust };
    }
    async getScore(sessionId) {
        const session = await this.prisma.examSession.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        const cached = await this.redis.hget(this.redisKey(sessionId), 'trust');
        const latest = await this.prisma.aiProctoringResult.findFirst({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
        });
        return { trustScore: (cached ? Number(cached) : session.trustScore) ?? null, latest };
    }
};
exports.ProctoringService = ProctoringService;
exports.ProctoringService = ProctoringService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Function, proctoring_nosql_1.ProctoringNoSqlWriter])
], ProctoringService);
//# sourceMappingURL=proctoring.service.js.map