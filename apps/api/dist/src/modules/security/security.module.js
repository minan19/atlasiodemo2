"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const ops_module_1 = require("../ops/ops.module");
const notifications_module_1 = require("../notifications/notifications.module");
const security_service_1 = require("./security.service");
const honeypot_controller_1 = require("./honeypot.controller");
const summary_controller_1 = require("./summary.controller");
let SecurityModule = class SecurityModule {
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, ops_module_1.OpsModule, notifications_module_1.NotificationsModule],
        providers: [security_service_1.SecurityService],
        exports: [security_service_1.SecurityService],
        controllers: [honeypot_controller_1.HoneypotController, summary_controller_1.SecuritySummaryController],
    })
], SecurityModule);
//# sourceMappingURL=security.module.js.map