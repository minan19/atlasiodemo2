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
exports.EventStreamController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const event_stream_service_1 = require("./event-stream.service");
const client_1 = require("@prisma/client");
class EmitEventDto {
}
class ForwardLrsDto {
}
let EventStreamController = class EventStreamController {
    constructor(eventStream) {
        this.eventStream = eventStream;
    }
    async emitEvent(dto, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        const userId = req.user?.id ?? req.user?.userId;
        return this.eventStream.emit({
            tenantId,
            userId,
            eventType: dto.eventType,
            objectType: dto.objectType,
            objectId: dto.objectId,
            objectName: dto.objectName,
            result: dto.result,
            context: dto.context,
            metadata: dto.metadata,
        });
    }
    async getEvents(req, userId, eventType, objectType, from, to, limit, offset) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.eventStream.getEvents(tenantId, {
            userId,
            eventType,
            objectType,
            from,
            to,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }
    async getAnalytics(req, days) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.eventStream.getEventAnalytics(tenantId, days ? parseInt(days, 10) : 30);
    }
    async getRealtimeCounts(req, date) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.eventStream.getRealtimeCounts(tenantId, date);
    }
    async exportXApi(req, from, to, limit) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.eventStream.exportXApiStatements(tenantId, from, to, limit ? parseInt(limit, 10) : 100);
    }
    async exportCaliper(req, from, to, limit) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.eventStream.exportCaliperEvents(tenantId, from, to, limit ? parseInt(limit, 10) : 100);
    }
    async forwardToLrs(dto, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.eventStream.forwardToLrs(tenantId, dto.lrsUrl, dto.authHeader, dto.format, dto.from, dto.to);
    }
};
exports.EventStreamController = EventStreamController;
__decorate([
    (0, common_1.Post)('emit'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR', 'STUDENT'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EmitEventDto, Object]),
    __metadata("design:returntype", Promise)
], EventStreamController.prototype, "emitEvent", null);
__decorate([
    (0, common_1.Get)('events'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('userId')),
    __param(2, (0, common_1.Query)('eventType')),
    __param(3, (0, common_1.Query)('objectType')),
    __param(4, (0, common_1.Query)('from')),
    __param(5, (0, common_1.Query)('to')),
    __param(6, (0, common_1.Query)('limit')),
    __param(7, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], EventStreamController.prototype, "getEvents", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EventStreamController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('realtime'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EventStreamController.prototype, "getRealtimeCounts", null);
__decorate([
    (0, common_1.Get)('export/xapi'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], EventStreamController.prototype, "exportXApi", null);
__decorate([
    (0, common_1.Get)('export/caliper'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], EventStreamController.prototype, "exportCaliper", null);
__decorate([
    (0, common_1.Post)('forward-lrs'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ForwardLrsDto, Object]),
    __metadata("design:returntype", Promise)
], EventStreamController.prototype, "forwardToLrs", null);
exports.EventStreamController = EventStreamController = __decorate([
    (0, swagger_1.ApiTags)('event-stream'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('event-stream'),
    __metadata("design:paramtypes", [event_stream_service_1.EventStreamService])
], EventStreamController);
//# sourceMappingURL=event-stream.controller.js.map