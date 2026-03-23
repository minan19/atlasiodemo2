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
exports.AiSafetyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const ai_safety_service_1 = require("./ai-safety.service");
class SafetyCheckDto {
}
class ModelAccessDto {
}
let AiSafetyController = class AiSafetyController {
    constructor(safety) {
        this.safety = safety;
    }
    async checkInput(dto, req) {
        const userId = req.user?.id ?? req.user?.userId;
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.safety.checkInput(dto.text, userId, tenantId);
    }
    async checkOutput(dto, req) {
        const userId = req.user?.id ?? req.user?.userId;
        return this.safety.checkOutput(dto.text, userId);
    }
    maskPii(dto) {
        return this.safety.maskPii(dto.text);
    }
    checkModelAccess(dto, req) {
        const role = req.user?.role ?? 'STUDENT';
        return this.safety.validateAiRequest(dto.modelId, {
            role,
            maxTokens: dto.maxTokens,
            temperature: dto.temperature,
        });
    }
    async getSafetyStats(req, days) {
        const tenantId = req.tenantId ?? req.user?.tenantId;
        return this.safety.getSafetyStats(tenantId, days ? parseInt(days, 10) : 30);
    }
};
exports.AiSafetyController = AiSafetyController;
__decorate([
    (0, common_1.Post)('check-input'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR', 'STUDENT'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SafetyCheckDto, Object]),
    __metadata("design:returntype", Promise)
], AiSafetyController.prototype, "checkInput", null);
__decorate([
    (0, common_1.Post)('check-output'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SafetyCheckDto, Object]),
    __metadata("design:returntype", Promise)
], AiSafetyController.prototype, "checkOutput", null);
__decorate([
    (0, common_1.Post)('mask-pii'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SafetyCheckDto]),
    __metadata("design:returntype", void 0)
], AiSafetyController.prototype, "maskPii", null);
__decorate([
    (0, common_1.Post)('check-model'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR', 'STUDENT'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ModelAccessDto, Object]),
    __metadata("design:returntype", void 0)
], AiSafetyController.prototype, "checkModelAccess", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AiSafetyController.prototype, "getSafetyStats", null);
exports.AiSafetyController = AiSafetyController = __decorate([
    (0, swagger_1.ApiTags)('ai-safety'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('ai-safety'),
    __metadata("design:paramtypes", [ai_safety_service_1.AiSafetyService])
], AiSafetyController);
//# sourceMappingURL=ai-safety.controller.js.map