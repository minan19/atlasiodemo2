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
exports.AiAgentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const ai_agents_service_1 = require("./ai-agents.service");
const dto_1 = require("./dto");
let AiAgentsController = class AiAgentsController {
    constructor(ai) {
        this.ai = ai;
    }
    list(req) {
        return this.ai.listForUser(req.user.id ?? req.user.userId);
    }
    execute(id, req) {
        return this.ai.executeAgent(id, req.user.id ?? req.user.userId);
    }
    logs(id) {
        return this.ai.getLogs(id);
    }
    context(id, dto) {
        return this.ai.addContext(id, dto);
    }
    feedback(id, dto, req) {
        return this.ai.addFeedback(id, dto, req.user.id ?? req.user.userId);
    }
};
exports.AiAgentsController = AiAgentsController;
__decorate([
    (0, common_1.Get)('agents'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiAgentsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('agents/:id/execute'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AiAgentsController.prototype, "execute", null);
__decorate([
    (0, common_1.Get)('agents/:id/logs'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiAgentsController.prototype, "logs", null);
__decorate([
    (0, common_1.Post)('agents/:id/context'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AiContextDto]),
    __metadata("design:returntype", void 0)
], AiAgentsController.prototype, "context", null);
__decorate([
    (0, common_1.Post)('agents/:id/feedback'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AiAgentFeedbackDto, Object]),
    __metadata("design:returntype", void 0)
], AiAgentsController.prototype, "feedback", null);
exports.AiAgentsController = AiAgentsController = __decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiTags)('ai'),
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [ai_agents_service_1.AiAgentsService])
], AiAgentsController);
//# sourceMappingURL=ai-agents.controller.js.map