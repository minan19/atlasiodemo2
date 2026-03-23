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
exports.WhiteboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bypass_guard_1 = require("../auth/bypass.guard");
const whiteboard_service_1 = require("./whiteboard.service");
const dto_1 = require("./dto");
let WhiteboardController = class WhiteboardController {
    constructor(whiteboard) {
        this.whiteboard = whiteboard;
    }
    start(dto) {
        return this.whiteboard.start(dto.liveSessionId);
    }
    actions(sessionId, since, until, limit, includeReverted, afterId) {
        const sinceDate = since ? new Date(since) : undefined;
        const untilDate = until ? new Date(until) : undefined;
        const take = limit ? Number(limit) : undefined;
        return since || until
            ? this.whiteboard.getActionsRange(sessionId, sinceDate, untilDate, take ?? 2000, includeReverted === 'true', afterId)
            : this.whiteboard.getActions(sessionId, take ?? 500);
    }
    snapshot(sessionId, limit, includeReverted) {
        return this.whiteboard.getSnapshot(sessionId, limit ? Number(limit) : 2000, includeReverted === 'true');
    }
    createLayer(dto, req) {
        return this.whiteboard.createLayer(dto.sessionId, dto.name, req.user?.id);
    }
    deleteLayer(dto, req) {
        return this.whiteboard.deleteLayer(dto.sessionId, dto.name, req.user?.id);
    }
    listLayers(sessionId) {
        return this.whiteboard.listLayers(sessionId);
    }
    state(sessionId, limitPerLayer) {
        return this.whiteboard.getActiveState(sessionId, limitPerLayer ? Number(limitPerLayer) : 2000);
    }
    canvas(sessionId, limitPerLayer, gzip, res) {
        const limit = limitPerLayer ? Number(limitPerLayer) : 2000;
        const shouldGzip = gzip === 'true';
        if (!shouldGzip || !res) {
            return this.whiteboard.getActiveCanvas(sessionId, limit);
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Encoding', 'gzip');
        const stream = this.whiteboard.getActiveCanvasStream(sessionId, limit);
        stream.pipe(res);
    }
    async playbackStream(res, sessionId, since, until, limit, includeReverted, afterId, chunkSize, gzipLevel) {
        const sinceDate = since ? new Date(since) : undefined;
        const untilDate = until ? new Date(until) : undefined;
        const take = limit ? Number(limit) : 5000;
        const maxLimit = Number(process.env.WB_PLAYBACK_MAX_LIMIT ?? 20000);
        const maxChunk = Number(process.env.WB_PLAYBACK_MAX_CHUNK ?? 10000);
        const safeLimit = Math.min(take, maxLimit);
        const safeChunk = chunkSize ? Math.min(Number(chunkSize), maxChunk) : undefined;
        const timeoutMs = Number(process.env.WB_PLAYBACK_TIMEOUT_MS ?? 15000);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('X-Playback-Limit', String(safeLimit));
        res.setHeader('X-Playback-Chunk', String(safeChunk ?? 'auto'));
        const streamPromise = this.whiteboard.getActionsStream(sessionId, sinceDate, untilDate, safeLimit, includeReverted === 'true', afterId, safeChunk, gzipLevel ? Number(gzipLevel) : undefined);
        const timeout = setTimeout(() => {
            res.destroy(new Error('playback timeout'));
        }, timeoutMs);
        try {
            const stream = await streamPromise;
            stream.on('end', () => clearTimeout(timeout));
            stream.on('error', () => clearTimeout(timeout));
            stream.pipe(res);
        }
        catch (err) {
            clearTimeout(timeout);
            res.status(500).json({ message: 'playback failed', error: err.message });
        }
    }
};
exports.WhiteboardController = WhiteboardController;
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.StartWhiteboardDto]),
    __metadata("design:returntype", void 0)
], WhiteboardController.prototype, "start", null);
__decorate([
    (0, common_1.Get)(':sessionId/actions'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Query)('since')),
    __param(2, (0, common_1.Query)('until')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('includeReverted')),
    __param(5, (0, common_1.Query)('afterId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], WhiteboardController.prototype, "actions", null);
__decorate([
    (0, common_1.Get)(':sessionId/snapshot'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('includeReverted')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], WhiteboardController.prototype, "snapshot", null);
__decorate([
    (0, common_1.Post)('layer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateLayerDto, Object]),
    __metadata("design:returntype", void 0)
], WhiteboardController.prototype, "createLayer", null);
__decorate([
    (0, common_1.Post)('layer/delete'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.DeleteLayerDto, Object]),
    __metadata("design:returntype", void 0)
], WhiteboardController.prototype, "deleteLayer", null);
__decorate([
    (0, common_1.Get)(':sessionId/layers'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WhiteboardController.prototype, "listLayers", null);
__decorate([
    (0, common_1.Get)(':sessionId/state'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Query)('limitPerLayer')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], WhiteboardController.prototype, "state", null);
__decorate([
    (0, common_1.Get)(':sessionId/canvas'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Query)('limitPerLayer')),
    __param(2, (0, common_1.Query)('gzip')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], WhiteboardController.prototype, "canvas", null);
__decorate([
    (0, common_1.Get)(':sessionId/playback-stream'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __param(2, (0, common_1.Query)('since')),
    __param(3, (0, common_1.Query)('until')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('includeReverted')),
    __param(6, (0, common_1.Query)('afterId')),
    __param(7, (0, common_1.Query)('chunkSize')),
    __param(8, (0, common_1.Query)('gzipLevel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], WhiteboardController.prototype, "playbackStream", null);
exports.WhiteboardController = WhiteboardController = __decorate([
    (0, swagger_1.ApiTags)('whiteboard'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(bypass_guard_1.BypassAuthGuard),
    (0, common_1.Controller)('whiteboard'),
    __metadata("design:paramtypes", [whiteboard_service_1.WhiteboardService])
], WhiteboardController);
//# sourceMappingURL=whiteboard.controller.js.map