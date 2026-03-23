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
var NotificationsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = require("jsonwebtoken");
let NotificationsGateway = NotificationsGateway_1 = class NotificationsGateway {
    constructor() {
        this.logger = new common_1.Logger(NotificationsGateway_1.name);
    }
    handleConnection(client) {
        const user = this.authenticate(client);
        if (!user) {
            client.disconnect(true);
            return;
        }
        const role = (user.role ?? '').toUpperCase();
        if (role === 'ADMIN' || role === 'HEAD_INSTRUCTOR') {
            client.join('admins');
            this.logger.debug(`Admin connected: ${user.id ?? user.sub}`);
        }
        else {
            const uid = user.id ?? user.sub;
            if (uid)
                client.join(`user:${uid}`);
        }
    }
    handleDisconnect(client) {
        this.logger.debug(`Client disconnected: ${client.id}`);
    }
    emitAlarm(payload) {
        this.server.to('admins').emit('alarm', payload);
    }
    emitToUser(userId, event, payload) {
        this.server.to(`user:${userId}`).emit(event, payload);
    }
    handlePing(client) {
        client.emit('pong', { ts: Date.now() });
    }
    authenticate(client) {
        const token = client.handshake.auth?.token ??
            client.handshake.headers['authorization']?.toString()?.replace('Bearer ', '');
        if (!token)
            return null;
        const secret = process.env.JWT_SECRET;
        if (!secret)
            return null;
        try {
            return jsonwebtoken_1.default.verify(token, secret);
        }
        catch {
            return null;
        }
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], NotificationsGateway.prototype, "handlePing", null);
exports.NotificationsGateway = NotificationsGateway = NotificationsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/notifications', cors: { origin: '*' } })
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map