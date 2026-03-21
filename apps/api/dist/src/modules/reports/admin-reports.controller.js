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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const admin_reports_service_1 = require("./admin-reports.service");
let AdminReportsController = class AdminReportsController {
    constructor(svc) {
        this.svc = svc;
    }
    finance() {
        return this.svc.finance();
    }
    intel() {
        return this.svc.intel();
    }
    salesAi() {
        return this.svc.salesAi();
    }
    kpi() {
        return this.svc.kpi();
    }
    tenants() {
        return this.svc.tenants();
    }
    systemHealth() {
        return this.svc.systemHealth();
    }
};
exports.AdminReportsController = AdminReportsController;
__decorate([
    (0, common_1.Get)('finance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminReportsController.prototype, "finance", null);
__decorate([
    (0, common_1.Get)('intel'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminReportsController.prototype, "intel", null);
__decorate([
    (0, common_1.Get)('sales-ai'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminReportsController.prototype, "salesAi", null);
__decorate([
    (0, common_1.Get)('kpi'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminReportsController.prototype, "kpi", null);
__decorate([
    (0, common_1.Get)('tenants'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminReportsController.prototype, "tenants", null);
__decorate([
    (0, common_1.Get)('system-health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminReportsController.prototype, "systemHealth", null);
exports.AdminReportsController = AdminReportsController = __decorate([
    (0, swagger_1.ApiTags)('admin-reports'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Controller)('admin/reports'),
    __metadata("design:paramtypes", [admin_reports_service_1.AdminReportsService])
], AdminReportsController);
//# sourceMappingURL=admin-reports.controller.js.map