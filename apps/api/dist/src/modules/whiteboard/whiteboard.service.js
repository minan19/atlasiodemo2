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
exports.WhiteboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const stream_1 = require("stream");
const zlib_1 = require("zlib");
let WhiteboardService = class WhiteboardService {
    constructor(prisma) {
        this.prisma = prisma;
        this.layerSpamCounter = {};
    }
    async start(liveSessionId) {
        const live = await this.prisma.liveSession.findUnique({ where: { id: liveSessionId } });
        if (!live)
            throw new common_1.NotFoundException('Live session not found');
        const wb = await this.prisma.whiteboardSession.upsert({
            where: { liveSessionId },
            create: { liveSessionId },
            update: {},
        });
        return wb;
    }
    async createLayer(sessionId, name, userId) {
        if (!(await this.canManageLayers(sessionId, userId))) {
            throw new common_1.NotFoundException('Not allowed');
        }
        const exists = await this.prisma.whiteboardLayer.findUnique({
            where: { sessionId_name: { sessionId, name } },
        });
        if (exists)
            return { layerId: name, existed: true };
        await this.prisma.whiteboardLayer.create({
            data: { sessionId, name, createdBy: userId },
        });
        await this.prisma.whiteboardAction.create({
            data: {
                sessionId,
                type: 'LAYER_CREATE',
                layerId: name,
                payload: { layerId: name, createdBy: userId },
                userId,
            },
        });
        await this.bumpLayerSpam(sessionId, userId);
        return { layerId: name, existed: false };
    }
    async deleteLayer(sessionId, name, userId) {
        if (!(await this.canManageLayers(sessionId, userId))) {
            throw new common_1.NotFoundException('Not allowed');
        }
        await this.prisma.whiteboardLayer.deleteMany({ where: { sessionId, name } });
        await this.prisma.whiteboardAction.create({
            data: {
                sessionId,
                type: 'LAYER_DELETE',
                layerId: name,
                payload: { layerId: name, deletedBy: userId },
                userId,
            },
        });
        await this.bumpLayerSpam(sessionId, userId);
        return { layerId: name, deleted: true };
    }
    async listLayers(sessionId) {
        const rows = await this.prisma.whiteboardLayer.findMany({
            where: { sessionId },
            orderBy: { name: 'asc' },
        });
        const names = ['default', ...rows.map((r) => r.name)];
        return Array.from(new Set(names));
    }
    async canManageLayers(sessionId, userId) {
        if (!userId)
            return false;
        const wb = await this.prisma.whiteboardSession.findUnique({
            where: { id: sessionId },
            include: { LiveSession: true },
        });
        if (!wb)
            return false;
        if (wb.LiveSession.instructorId === userId)
            return true;
        const participant = await this.prisma.liveSessionParticipant.findFirst({
            where: { sessionId: wb.liveSessionId, userId },
            select: { role: true },
        });
        return participant?.role === 'INSTRUCTOR' || participant?.role === 'ADMIN';
    }
    async bumpLayerSpam(sessionId, userId) {
        const now = Date.now();
        const windowMs = Number(process.env.WB_ALERT_WINDOW ?? 60000);
        const key = `${sessionId}:${userId ?? 'unknown'}`;
        const bucket = this.layerSpamCounter[key] ?? { ts: now, count: 0 };
        if (now - bucket.ts > windowMs) {
            this.layerSpamCounter[key] = { ts: now, count: 1 };
            return;
        }
        bucket.count += 1;
        this.layerSpamCounter[key] = bucket;
        const count = bucket.count;
        const alerts = this.alerts;
        if (alerts?.alertLayerSpam) {
            await alerts.alertLayerSpam(sessionId, userId, count);
        }
    }
    async recordAction(dto, socketId) {
        const created = await this.prisma.whiteboardAction.create({
            data: {
                sessionId: dto.sessionId,
                type: dto.type,
                payload: dto.payload,
                userId: dto.payload?.userId,
                socketId,
                layerId: dto.layerId ?? dto.payload?.layerId ?? 'default',
                targetActionId: dto.targetActionId ?? dto.payload?.targetActionId,
            },
        });
        return created;
    }
    async getActions(sessionId, limit = 500) {
        return this.prisma.whiteboardAction.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
    }
    async validateTargetAction(sessionId, targetActionId) {
        if (!targetActionId)
            return false;
        const target = await this.prisma.whiteboardAction.findUnique({
            where: { id: targetActionId },
            select: { id: true, sessionId: true },
        });
        return !!target && target.sessionId === sessionId;
    }
    async markReverted(targetActionId, reverted) {
        return this.prisma.whiteboardAction.update({
            where: { id: targetActionId },
            data: { reverted },
        });
    }
    async canWrite(sessionId, userId) {
        const wb = await this.prisma.whiteboardSession.findUnique({ where: { id: sessionId }, include: { LiveSession: true } });
        if (!wb)
            throw new common_1.NotFoundException('Whiteboard session not found');
        if (!userId)
            return false;
        if (wb.LiveSession.instructorId === userId)
            return true;
        const participant = await this.prisma.liveSessionParticipant.findFirst({
            where: { sessionId: wb.liveSessionId, userId },
            select: { role: true },
        });
        return participant?.role === 'INSTRUCTOR' || participant?.role === 'ADMIN';
    }
    async getSnapshot(sessionId, limit = 2000, includeReverted = false) {
        const actions = await this.prisma.whiteboardAction.findMany({
            where: includeReverted ? { sessionId } : { sessionId, reverted: { not: true } },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
        return {
            sessionId,
            count: actions.length,
            actions,
        };
    }
    async getActionsRange(sessionId, since, until, limit = 2000, includeReverted = false, afterId) {
        const cursorAction = afterId
            ? await this.prisma.whiteboardAction.findUnique({
                where: { id: afterId },
                select: { createdAt: true, id: true },
            })
            : null;
        return this.prisma.whiteboardAction.findMany({
            where: {
                ...(includeReverted ? { sessionId } : { sessionId, reverted: { not: true } }),
                createdAt: {
                    gt: cursorAction?.createdAt,
                    gte: cursorAction?.createdAt ? undefined : since,
                    lte: until,
                },
            },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
    }
    async getActiveState(sessionId, limitPerLayer = 2000) {
        const layers = await this.listLayers(sessionId);
        const byLayer = {};
        for (const layer of layers) {
            const actions = await this.prisma.whiteboardAction.findMany({
                where: { sessionId, layerId: layer, reverted: { not: true } },
                orderBy: { createdAt: 'asc' },
                take: limitPerLayer,
            });
            byLayer[layer] = actions;
        }
        return { sessionId, layers: byLayer };
    }
    async getActiveCanvas(sessionId, limitPerLayer = 2000) {
        const layers = await this.listLayers(sessionId);
        const frames = {};
        for (const layer of layers) {
            const actions = await this.prisma.whiteboardAction.findMany({
                where: { sessionId, layerId: layer, reverted: { not: true } },
                orderBy: { createdAt: 'asc' },
                take: limitPerLayer,
            });
            frames[layer] = actions.map((a) => ({
                id: a.id,
                type: a.type,
                payload: a.payload,
                createdAt: a.createdAt,
                userId: a.userId,
            }));
        }
        return { sessionId, canvas: frames };
    }
    getActiveCanvasStream(sessionId, limitPerLayer = 2000) {
        const gzip = (0, zlib_1.createGzip)();
        const out = new stream_1.PassThrough();
        (async () => {
            out.write('{"sessionId":"' + sessionId + '","canvas":{');
            const layers = await this.listLayers(sessionId);
            let firstLayer = true;
            for (const layer of layers) {
                const actions = await this.prisma.whiteboardAction.findMany({
                    where: { sessionId, layerId: layer, reverted: { not: true } },
                    orderBy: { createdAt: 'asc' },
                    take: limitPerLayer,
                });
                if (!firstLayer)
                    out.write(',');
                out.write(`"${layer}":`);
                out.write(JSON.stringify(actions.map((a) => ({
                    id: a.id,
                    type: a.type,
                    payload: a.payload,
                    createdAt: a.createdAt,
                    userId: a.userId,
                }))));
                firstLayer = false;
            }
            out.write('}}');
            out.end();
        })().catch((err) => {
            out.destroy(err);
        });
        return out.pipe(gzip);
    }
    async getActionsStream(sessionId, since, until, limit = 5000, includeReverted = false, afterId, chunkSize = 5000, gzipLevel = 6) {
        const gzip = (0, zlib_1.createGzip)({ level: gzipLevel });
        const out = new stream_1.PassThrough();
        out.write('{"sessionId":"' + sessionId + '","actions":[');
        let cursor = afterId;
        let first = true;
        while (true) {
            const batch = await this.getActionsRange(sessionId, since, until, chunkSize, includeReverted, cursor);
            if (batch.length === 0)
                break;
            for (const a of batch) {
                if (!first)
                    out.write(',');
                out.write(JSON.stringify(a));
                first = false;
            }
            if (batch.length < chunkSize)
                break;
            cursor = batch[batch.length - 1].id;
        }
        out.write(']}');
        out.end();
        return out.pipe(gzip);
    }
};
exports.WhiteboardService = WhiteboardService;
exports.WhiteboardService = WhiteboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WhiteboardService);
//# sourceMappingURL=whiteboard.service.js.map