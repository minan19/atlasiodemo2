"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpsModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const ops_controller_1 = require("./ops.controller");
const metrics_service_1 = require("./metrics.service");
const latency_interceptor_1 = require("./latency.interceptor");
const prisma_module_1 = require("../prisma/prisma.module");
const ops_webhook_service_1 = require("./ops.webhook.service");
const notifications_module_1 = require("../notifications/notifications.module");
let OpsModule = class OpsModule {
};
exports.OpsModule = OpsModule;
exports.OpsModule = OpsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, notifications_module_1.NotificationsModule],
        controllers: [ops_controller_1.OpsController],
        providers: [
            metrics_service_1.MetricsService,
            ops_webhook_service_1.OpsWebhookService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: latency_interceptor_1.LatencyInterceptor,
            },
        ],
        exports: [metrics_service_1.MetricsService, ops_webhook_service_1.OpsWebhookService],
    })
], OpsModule);
//# sourceMappingURL=ops.module.js.map