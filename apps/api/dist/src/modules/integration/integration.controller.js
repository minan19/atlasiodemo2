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
exports.IntegrationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const integration_service_1 = require("./integration.service");
class ConnectorDto {
}
let IntegrationController = class IntegrationController {
    constructor(integration) {
        this.integration = integration;
    }
    connectors(req) {
        const tenantId = req.headers['x-tenant-id'];
        return this.integration.listConnectors(tenantId);
    }
    upsert(dto, req) {
        const tenantId = req.headers['x-tenant-id'];
        return this.integration.upsertConnector(tenantId, dto);
    }
};
exports.IntegrationController = IntegrationController;
__decorate([
    (0, common_1.Get)('connectors'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntegrationController.prototype, "connectors", null);
__decorate([
    (0, common_1.Post)('connectors'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ConnectorDto, Object]),
    __metadata("design:returntype", void 0)
], IntegrationController.prototype, "upsert", null);
exports.IntegrationController = IntegrationController = __decorate([
    (0, swagger_1.ApiTags)('integration'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('integration'),
    __metadata("design:paramtypes", [integration_service_1.IntegrationService])
], IntegrationController);
//# sourceMappingURL=integration.controller.js.map