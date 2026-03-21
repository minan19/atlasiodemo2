"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsModule = void 0;
const common_1 = require("@nestjs/common");
const reports_controller_1 = require("./reports.controller");
const reports_service_1 = require("./reports.service");
const documents_module_1 = require("../documents/documents.module");
const notifications_module_1 = require("../notifications/notifications.module");
const auth_module_1 = require("../auth/auth.module");
const admin_reports_controller_1 = require("./admin-reports.controller");
const admin_reports_service_1 = require("./admin-reports.service");
const prisma_service_1 = require("../prisma/prisma.service");
const infra_module_1 = require("../../infra/infra.module");
let ReportsModule = class ReportsModule {
};
exports.ReportsModule = ReportsModule;
exports.ReportsModule = ReportsModule = __decorate([
    (0, common_1.Module)({
        imports: [documents_module_1.DocumentsModule, notifications_module_1.NotificationsModule, auth_module_1.AuthModule, infra_module_1.InfraModule],
        controllers: [reports_controller_1.ReportsController, admin_reports_controller_1.AdminReportsController],
        providers: [reports_service_1.ReportsService, admin_reports_service_1.AdminReportsService, prisma_service_1.PrismaService],
        exports: [reports_service_1.ReportsService, admin_reports_service_1.AdminReportsService],
    })
], ReportsModule);
//# sourceMappingURL=reports.module.js.map