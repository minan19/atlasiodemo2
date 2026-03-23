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
exports.LtiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const lti_service_1 = require("./lti.service");
const dto_1 = require("./dto");
let LtiController = class LtiController {
    constructor(service) {
        this.service = service;
    }
    listTools() {
        return this.service.listTools();
    }
    createTool(dto, req) {
        return this.service.createTool(dto, req.user?.id ?? req.user?.userId);
    }
    updateTool(id, dto, req) {
        return this.service.updateTool(id, dto, req.user?.id ?? req.user?.userId);
    }
    createDeployment(dto, req) {
        return this.service.createDeployment(dto, req.user?.id ?? req.user?.userId);
    }
    recordLaunch(dto) {
        return this.service.processLaunch(dto);
    }
    getJwks() {
        return this.service.getJwks();
    }
    oidcLogin(payload) {
        return this.service.initiateOidcLogin(payload);
    }
    deployments(id) {
        return this.service.getDeploymentsForTool(id);
    }
};
exports.LtiController = LtiController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Get)('tools'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LtiController.prototype, "listTools", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Post)('tools'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateLtiToolDto, Object]),
    __metadata("design:returntype", void 0)
], LtiController.prototype, "createTool", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Patch)('tools/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateLtiToolDto, Object]),
    __metadata("design:returntype", void 0)
], LtiController.prototype, "updateTool", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)('deployments'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateLtiDeploymentDto, Object]),
    __metadata("design:returntype", void 0)
], LtiController.prototype, "createDeployment", null);
__decorate([
    (0, common_1.Post)('launch'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.LtiLaunchDto]),
    __metadata("design:returntype", void 0)
], LtiController.prototype, "recordLaunch", null);
__decorate([
    (0, common_1.Get)('jwks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LtiController.prototype, "getJwks", null);
__decorate([
    (0, common_1.Post)('oidc-login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LtiController.prototype, "oidcLogin", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Get)('tools/:id/deployments'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LtiController.prototype, "deployments", null);
exports.LtiController = LtiController = __decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiTags)('lti'),
    (0, common_1.Controller)('lti'),
    __metadata("design:paramtypes", [lti_service_1.LtiService])
], LtiController);
//# sourceMappingURL=lti.controller.js.map