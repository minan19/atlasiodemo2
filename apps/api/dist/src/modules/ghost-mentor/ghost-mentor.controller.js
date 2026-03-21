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
exports.GhostMentorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const dto_1 = require("./dto");
const ghost_mentor_service_1 = require("./ghost-mentor.service");
let GhostMentorController = class GhostMentorController {
    constructor(ghost) {
        this.ghost = ghost;
    }
    ask(req, dto) {
        return this.ghost.ask(req.user.id ?? req.user.userId, dto);
    }
    preload(req, dto) {
        return this.ghost.preloadFaq(req.user.id ?? req.user.userId, dto);
    }
};
exports.GhostMentorController = GhostMentorController;
__decorate([
    (0, common_1.Post)('ask'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.GhostAskDto]),
    __metadata("design:returntype", void 0)
], GhostMentorController.prototype, "ask", null);
__decorate([
    (0, common_1.Post)('preload-faq'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.GhostPreloadFaqDto]),
    __metadata("design:returntype", void 0)
], GhostMentorController.prototype, "preload", null);
exports.GhostMentorController = GhostMentorController = __decorate([
    (0, swagger_1.ApiTags)('ghost-mentor'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('ghost-mentor'),
    __metadata("design:paramtypes", [ghost_mentor_service_1.GhostMentorService])
], GhostMentorController);
//# sourceMappingURL=ghost-mentor.controller.js.map