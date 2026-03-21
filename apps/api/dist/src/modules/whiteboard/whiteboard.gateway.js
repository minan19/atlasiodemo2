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
exports.WhiteboardGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const whiteboard_service_1 = require("./whiteboard.service");
const dto_1 = require("./dto");
const jsonwebtoken_1 = require("jsonwebtoken");
const whiteboard_alerts_1 = require("./whiteboard.alerts");
let WhiteboardGateway = class WhiteboardGateway {
    constructor(service, alerts) {
        this.service = service;
        this.alerts = alerts;
        this.undoWindow = {};
        this.rateCounter = {};
    }
    async authenticate(client) {
        const token = client.handshake.auth?.token || client.handshake.headers['authorization']?.toString()?.replace('Bearer ', '');
        if (!token)
            return null;
        const secret = process.env.JWT_SECRET;
        if (!secret)
            return null;
        try {
            const payload = jsonwebtoken_1.default.verify(token, secret);
            return payload;
        }
        catch {
            return null;
        }
    }
    async alertUndo(sessionId, userId) {
        const now = Date.now();
        const bucket = this.undoWindow[sessionId] ?? { ts: now, count: 0 };
        if (now - bucket.ts > 1000 * this.alerts['windowSeconds']) {
            this.undoWindow[sessionId] = { ts: now, count: 1 };
            return;
        }
        bucket.count += 1;
        this.undoWindow[sessionId] = bucket;
        await this.alerts.maybeAlertUndoFlood(sessionId, userId, bucket.count);
    }
    async handleJoin(data, client) {
        const user = await this.authenticate(client);
        if (!user) {
            client.emit('forbidden', { reason: 'auth' });
            client.disconnect();
            return;
        }
        const userId = data.userId ?? user.id ?? user.userId ?? 'unknown';
        await client.join(data.sessionId);
        client.data.userId = userId;
        client.data.role = user.role ?? user.roles?.[0];
        client.data.sessionId = data.sessionId;
        client.emit('joined', { sessionId: data.sessionId });
    }
    async handleAction(dto, client) {
        const user = client.data?.userId ? { id: client.data.userId, role: client.data.role } : await this.authenticate(client);
        if (!user || (!user.id && !client.data?.userId)) {
            client.emit('forbidden', { reason: 'auth' });
            client.disconnect();
            return;
        }
        dto.userId = dto.userId ?? (client.data?.userId || user.id || 'unknown');
        const rateHit = this.isRateLimited(client.id);
        if (rateHit) {
            await this.alerts.alertRateLimited(dto.sessionId, dto.userId, rateHit);
            client.emit('forbidden', { reason: 'rate-limit' });
            return;
        }
        const payloadSize = JSON.stringify(dto.payload ?? {}).length;
        if (payloadSize > 32 * 1024) {
            client.emit('forbidden', { reason: 'payload-too-large' });
            await this.alerts.alertPayloadTooLarge(dto.sessionId, dto.userId, payloadSize);
            return;
        }
        if (!(await this.service.canWrite(dto.sessionId, dto.userId))) {
            client.emit('forbidden', { reason: 'no write permission' });
            return;
        }
        if ((dto.type === 'UNDO' || dto.type === 'REDO') && !(await this.service.validateTargetAction(dto.sessionId, dto.targetActionId))) {
            client.emit('forbidden', { reason: 'invalid-target' });
            return;
        }
        const saved = await this.service.recordAction(dto, client.id);
        if (dto.type === 'UNDO' && dto.targetActionId) {
            await this.service.markReverted(dto.targetActionId, true);
            await this.alertUndo(dto.sessionId, dto.userId);
        }
        else if (dto.type === 'REDO' && dto.targetActionId) {
            await this.service.markReverted(dto.targetActionId, false);
            await this.alertUndo(dto.sessionId, dto.userId);
        }
        this.server.to(dto.sessionId).emit('action', {
            ...dto,
            id: saved.id,
            createdAt: saved.createdAt,
        });
    }
    async handleSnapshot(data, client) {
        const sessionId = data.sessionId ?? client.data?.sessionId;
        if (!sessionId) {
            client.emit('forbidden', { reason: 'no-session' });
            return;
        }
        const snap = await this.service.getSnapshot(sessionId, data.limit ?? 2000, data.includeReverted ?? false);
        client.emit('snapshot', snap);
    }
    async handlePlayback(data, client) {
        const sessionId = data.sessionId ?? client.data?.sessionId;
        if (!sessionId) {
            client.emit('forbidden', { reason: 'no-session' });
            return;
        }
        const since = data.since ? new Date(data.since) : undefined;
        const until = data.until ? new Date(data.until) : undefined;
        const actions = await this.service.getActionsRange(sessionId, since, until, data.limit ?? 5000, data.includeReverted ?? false, data.afterId);
        client.emit('playback', { sessionId, count: actions.length, actions });
    }
    isRateLimited(socketId) {
        const role = this.server.sockets.sockets.get(socketId)?.data?.role;
        const threshold = role === 'INSTRUCTOR' || role === 'ADMIN' ? 50 : 10;
        const now = Date.now();
        const bucket = this.rateCounter[socketId] ?? { ts: now, count: 0 };
        if (now - bucket.ts > 1000) {
            this.rateCounter[socketId] = { ts: now, count: 1 };
            return false;
        }
        bucket.count += 1;
        this.rateCounter[socketId] = bucket;
        return bucket.count > threshold ? bucket.count : 0;
    }
};
exports.WhiteboardGateway = WhiteboardGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], WhiteboardGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], WhiteboardGateway.prototype, "handleJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('action'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.WhiteboardActionDto, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], WhiteboardGateway.prototype, "handleAction", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('snapshot'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], WhiteboardGateway.prototype, "handleSnapshot", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('playback'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], WhiteboardGateway.prototype, "handlePlayback", null);
exports.WhiteboardGateway = WhiteboardGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/whiteboard', cors: { origin: '*' } }),
    __metadata("design:paramtypes", [whiteboard_service_1.WhiteboardService,
        whiteboard_alerts_1.WhiteboardAlertsService])
], WhiteboardGateway);
//# sourceMappingURL=whiteboard.gateway.js.map