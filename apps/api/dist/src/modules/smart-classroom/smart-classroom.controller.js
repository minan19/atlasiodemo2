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
exports.SmartClassroomController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const roles_1 = require("../auth/roles");
const smart_classroom_service_1 = require("./smart-classroom.service");
let SmartClassroomController = class SmartClassroomController {
    constructor(service) {
        this.service = service;
    }
    getStatus(sessionId) {
        return this.service.getStatus(sessionId);
    }
    updateEnv(sessionId, dto, req) {
        const instructorId = req.user.id || req.user.userId;
        return this.service.updateEnvironment(sessionId, instructorId, dto);
    }
};
exports.SmartClassroomController = SmartClassroomController;
__decorate([
    (0, common_1.Get)(':liveSessionId'),
    __param(0, (0, common_1.Param)('liveSessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SmartClassroomController.prototype, "getStatus", null);
__decorate([
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)(':liveSessionId/control'),
    __param(0, (0, common_1.Param)('liveSessionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SmartClassroomController.prototype, "updateEnv", null);
exports.SmartClassroomController = SmartClassroomController = __decorate([
    (0, common_1.Controller)('smart-classroom'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [smart_classroom_service_1.SmartClassroomService])
], SmartClassroomController);
//# sourceMappingURL=smart-classroom.controller.js.map