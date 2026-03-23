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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsController = class NotificationsController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async alarms(req) {
        const role = req.user?.role ?? req.user?.roles?.[0];
        if (!['ADMIN', 'TECH'].includes(role)) {
            return [];
        }
        return this.prisma.auditLog.findMany({
            where: { action: { contains: 'security' } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async alarmCount(req) {
        const role = req.user?.role ?? req.user?.roles?.[0];
        if (!['ADMIN', 'TECH'].includes(role)) {
            return { count: 0 };
        }
        const count = await this.prisma.auditLog.count({
            where: { action: { contains: 'security' } },
        });
        return { count };
    }
    async myNotifications(req) {
        const userId = req.user.id ?? req.user.userId;
        return this.prisma.userNotification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 30,
        });
    }
    async myUnreadCount(req) {
        const userId = req.user.id ?? req.user.userId;
        const count = await this.prisma.userNotification.count({
            where: { userId, readAt: null },
        });
        return { count };
    }
    async markRead(id, req) {
        const userId = req.user.id ?? req.user.userId;
        return this.prisma.userNotification.updateMany({
            where: { id, userId },
            data: { readAt: new Date() },
        });
    }
    async markAllRead(req) {
        const userId = req.user.id ?? req.user.userId;
        await this.prisma.userNotification.updateMany({
            where: { userId, readAt: null },
            data: { readAt: new Date() },
        });
        return { ok: true };
    }
    async send(body, req) {
        const role = req.user?.role ?? req.user?.roles?.[0];
        if (!['ADMIN', 'TECH', 'HEAD_INSTRUCTOR', 'INSTRUCTOR'].includes(role)) {
            return { ok: false, reason: 'unauthorized' };
        }
        const notif = await this.prisma.userNotification.create({
            data: {
                userId: body.userId,
                title: body.title,
                body: body.body,
                type: body.type ?? 'info',
                link: body.link,
            },
        });
        return notif;
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('alarms'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "alarms", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('alarm-count'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "alarmCount", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "myNotifications", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('my/unread-count'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "myUnreadCount", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Patch)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markRead", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('my/read-all'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAllRead", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.Post)('send'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "send", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('notifications'),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map