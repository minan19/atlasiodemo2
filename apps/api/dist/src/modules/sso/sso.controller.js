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
exports.SsoController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const sso_service_1 = require("./sso.service");
let SsoController = class SsoController {
    constructor(sso) {
        this.sso = sso;
    }
    createProvider(dto, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.sso.createProvider(tenantId, dto);
    }
    listProviders(req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.sso.listProviders(tenantId);
    }
    getProvider(id, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.sso.getProvider(id, tenantId);
    }
    updateProvider(id, dto, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.sso.updateProvider(id, tenantId, dto);
    }
    deleteProvider(id, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.sso.deleteProvider(id, tenantId);
    }
    async publicProviders(tenantSlug) {
        return [];
    }
    async initiateOidc(providerId, tenantId, res) {
        const result = await this.sso.initiateOidc(providerId, tenantId ?? 'public');
        return res.redirect(result.url);
    }
    async oidcCallback(code, state, res) {
        const result = await this.sso.handleOidcCallback(code, state);
        const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';
        const params = new URLSearchParams({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
        return res.redirect(`${frontendUrl}/login?sso=success&${params.toString()}`);
    }
    async initiateSaml(providerId, tenantId, res) {
        const result = await this.sso.initiateSaml(providerId, tenantId ?? 'public');
        return res.redirect(result.url);
    }
    async samlAcs(samlResponse, relayState, res) {
        const result = await this.sso.handleSamlCallback(samlResponse, relayState);
        const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000';
        const params = new URLSearchParams({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
        return res.redirect(`${frontendUrl}/login?sso=success&${params.toString()}`);
    }
    getUserLinks(req) {
        return this.sso.getUserSsoLinks(req.user.id ?? req.user.userId);
    }
    unlinkSso(linkId, req) {
        return this.sso.unlinkSso(req.user.id ?? req.user.userId, linkId);
    }
};
exports.SsoController = SsoController;
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Post)('providers'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SsoController.prototype, "createProvider", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Get)('providers'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SsoController.prototype, "listProviders", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Get)('providers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SsoController.prototype, "getProvider", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Patch)('providers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SsoController.prototype, "updateProvider", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Delete)('providers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SsoController.prototype, "deleteProvider", null);
__decorate([
    (0, common_1.Get)('tenant/:tenantSlug/providers'),
    __param(0, (0, common_1.Param)('tenantSlug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SsoController.prototype, "publicProviders", null);
__decorate([
    (0, common_1.Get)('oidc/init/:providerId'),
    __param(0, (0, common_1.Param)('providerId')),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SsoController.prototype, "initiateOidc", null);
__decorate([
    (0, common_1.Get)('oidc/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SsoController.prototype, "oidcCallback", null);
__decorate([
    (0, common_1.Get)('saml/init/:providerId'),
    __param(0, (0, common_1.Param)('providerId')),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SsoController.prototype, "initiateSaml", null);
__decorate([
    (0, common_1.Post)('saml/acs'),
    __param(0, (0, common_1.Body)('SAMLResponse')),
    __param(1, (0, common_1.Body)('RelayState')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SsoController.prototype, "samlAcs", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me/links'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SsoController.prototype, "getUserLinks", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me/links/:linkId'),
    __param(0, (0, common_1.Param)('linkId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SsoController.prototype, "unlinkSso", null);
exports.SsoController = SsoController = __decorate([
    (0, swagger_1.ApiTags)('sso'),
    (0, common_1.Controller)('sso'),
    __metadata("design:paramtypes", [sso_service_1.SsoService])
], SsoController);
//# sourceMappingURL=sso.controller.js.map