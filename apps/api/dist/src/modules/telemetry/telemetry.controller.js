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
exports.TelemetryController = void 0;
const common_1 = require("@nestjs/common");
const telemetry_service_1 = require("./telemetry.service");
const bypass_guard_1 = require("../auth/bypass.guard");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
let TelemetryController = class TelemetryController {
    constructor(telemetry) {
        this.telemetry = telemetry;
    }
    async collect(body) {
        return this.telemetry.recordStream(body);
    }
    async insights(tenantId) {
        return this.telemetry.streamInsights(tenantId ?? 'public');
    }
};
exports.TelemetryController = TelemetryController;
__decorate([
    (0, common_1.Post)('stream'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelemetryController.prototype, "collect", null);
__decorate([
    (0, common_1.UseGuards)(bypass_guard_1.BypassAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Get)('stream/insights'),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TelemetryController.prototype, "insights", null);
exports.TelemetryController = TelemetryController = __decorate([
    (0, common_1.Controller)('telemetry'),
    __metadata("design:paramtypes", [telemetry_service_1.TelemetryService])
], TelemetryController);
//# sourceMappingURL=telemetry.controller.js.map