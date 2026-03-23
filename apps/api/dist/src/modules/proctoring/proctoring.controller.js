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
exports.ProctoringController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const proctoring_service_1 = require("./proctoring.service");
const dto_1 = require("./dto");
let ProctoringController = class ProctoringController {
    constructor(proctoring) {
        this.proctoring = proctoring;
    }
    start(req, dto) {
        return this.proctoring.startSession(req.user.id ?? req.user.userId, dto);
    }
    ingest(req, dto) {
        return this.proctoring.ingestEvent(req.user.id ?? req.user.userId, dto);
    }
    getScore(sessionId) {
        return this.proctoring.getScore(sessionId);
    }
};
exports.ProctoringController = ProctoringController;
__decorate([
    (0, common_1.Post)('sessions'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.StartProctorSessionDto]),
    __metadata("design:returntype", void 0)
], ProctoringController.prototype, "start", null);
__decorate([
    (0, common_1.Post)('events'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.ProctorEventDto]),
    __metadata("design:returntype", void 0)
], ProctoringController.prototype, "ingest", null);
__decorate([
    (0, common_1.Get)('score/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProctoringController.prototype, "getScore", null);
exports.ProctoringController = ProctoringController = __decorate([
    (0, swagger_1.ApiTags)('proctoring'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('proctor'),
    __metadata("design:paramtypes", [proctoring_service_1.ProctoringService])
], ProctoringController);
//# sourceMappingURL=proctoring.controller.js.map