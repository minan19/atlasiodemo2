"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhiteboardModule = void 0;
const common_1 = require("@nestjs/common");
const whiteboard_service_1 = require("./whiteboard.service");
const whiteboard_controller_1 = require("./whiteboard.controller");
const whiteboard_gateway_1 = require("./whiteboard.gateway");
const prisma_module_1 = require("../prisma/prisma.module");
const auth_module_1 = require("../auth/auth.module");
const whiteboard_alerts_1 = require("./whiteboard.alerts");
const notifications_module_1 = require("../notifications/notifications.module");
const ops_module_1 = require("../ops/ops.module");
let WhiteboardModule = class WhiteboardModule {
};
exports.WhiteboardModule = WhiteboardModule;
exports.WhiteboardModule = WhiteboardModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, auth_module_1.AuthModule, notifications_module_1.NotificationsModule, ops_module_1.OpsModule],
        controllers: [whiteboard_controller_1.WhiteboardController],
        providers: [whiteboard_service_1.WhiteboardService, whiteboard_gateway_1.WhiteboardGateway, whiteboard_alerts_1.WhiteboardAlertsService],
    })
], WhiteboardModule);
//# sourceMappingURL=whiteboard.module.js.map