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
exports.ObservabilityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const observability_service_1 = require("./observability.service");
let ObservabilityController = class ObservabilityController {
    constructor(obs) {
        this.obs = obs;
    }
    healthScore() {
        return this.obs.computeHealthScore();
    }
    driftAlerts(req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.obs.checkDrift(tenantId);
    }
    compliance(req, days) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.obs.generateComplianceReport(tenantId, days ? parseInt(days, 10) : 30);
    }
    tenantDashboard(req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.obs.getTenantDashboard(tenantId);
    }
    latency(service, operation) {
        return this.obs.getLatencyDistribution(service ?? 'api', operation ?? 'request');
    }
};
exports.ObservabilityController = ObservabilityController;
__decorate([
    (0, common_1.Get)('health-score'),
    (0, roles_1.Roles)('ADMIN'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ObservabilityController.prototype, "healthScore", null);
__decorate([
    (0, common_1.Get)('drift'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ObservabilityController.prototype, "driftAlerts", null);
__decorate([
    (0, common_1.Get)('compliance'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ObservabilityController.prototype, "compliance", null);
__decorate([
    (0, common_1.Get)('tenant-dashboard'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ObservabilityController.prototype, "tenantDashboard", null);
__decorate([
    (0, common_1.Get)('latency'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Query)('service')),
    __param(1, (0, common_1.Query)('operation')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ObservabilityController.prototype, "latency", null);
exports.ObservabilityController = ObservabilityController = __decorate([
    (0, swagger_1.ApiTags)('observability'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('observability'),
    __metadata("design:paramtypes", [observability_service_1.ObservabilityService])
], ObservabilityController);
//# sourceMappingURL=observability.controller.js.map