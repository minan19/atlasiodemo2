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
exports.LiveController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const live_service_1 = require("./live.service");
const dto_1 = require("./dto");
const live_join_guard_1 = require("./live.join.guard");
let LiveController = class LiveController {
    constructor(live) {
        this.live = live;
    }
    createSession(dto, req) {
        return this.live.createSession(dto, req.user.id ?? req.user.userId);
    }
    createLegacy(dto) {
        return this.live.createLegacySession(dto);
    }
    join(id, req) {
        return this.live.joinSession(id, req.user.id ?? req.user.userId, req.user.role ?? req.user.roles?.[0]);
    }
    joinLegacy(dto) {
        return this.live.joinLegacy(dto.sessionId, dto.studentId);
    }
    listLegacy() {
        return this.live.listLegacy();
    }
    updateSession(id, dto, req) {
        return this.live.updateSession(id, dto, req.user.id ?? req.user.userId);
    }
    addParticipant(sessionId, dto) {
        return this.live.addParticipant(sessionId, dto);
    }
    requestPresentation(dto, req) {
        return this.live.requestPresentation(dto, req.user.id ?? req.user.userId);
    }
    respondPresentation(dto, req) {
        return this.live.respondPresentation(dto, req.user.id ?? req.user.userId);
    }
    sendMessage(dto, req) {
        return this.live.sendMessage(dto, req.user.id ?? req.user.userId);
    }
    sendChat(dto, req) {
        return this.live.sendMessage({ sessionId: dto.sessionId, type: 'CHAT', content: dto.content }, req.user.id ?? req.user.userId);
    }
    listSessions(courseId) {
        return this.live.listSessions(courseId);
    }
    createBreakoutRooms(sessionId, dto, req) {
        return this.live.createBreakoutRooms(sessionId, req.user.id ?? req.user.userId, dto.count);
    }
};
exports.LiveController = LiveController;
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)('sessions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateLiveSessionDto, Object]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "createSession", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)('legacy'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateLegacyLiveDto]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "createLegacy", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), live_join_guard_1.LiveJoinGuard),
    (0, common_1.Post)('sessions/:id/join'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "join", null);
__decorate([
    (0, common_1.Post)('legacy/join'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.JoinLegacyDto]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "joinLegacy", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Get)('legacy/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "listLegacy", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Patch)('sessions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateLiveSessionDto, Object]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "updateSession", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)('sessions/:id/participants'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.ParticipantStateDto]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "addParticipant", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('presentations'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.PresentationRequestDto, Object]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "requestPresentation", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)('presentations/respond'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.PresentationResponseDto, Object]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "respondPresentation", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('messages'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CommunicationDto, Object]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "sendMessage", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.LiveChatDto, Object]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "sendChat", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Get)('sessions'),
    __param(0, (0, common_1.Query)('courseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "listSessions", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)('sessions/:id/breakout-rooms'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LiveController.prototype, "createBreakoutRooms", null);
exports.LiveController = LiveController = __decorate([
    (0, swagger_1.ApiTags)('live'),
    (0, common_1.Controller)('live'),
    __metadata("design:paramtypes", [live_service_1.LiveService])
], LiveController);
//# sourceMappingURL=live.controller.js.map