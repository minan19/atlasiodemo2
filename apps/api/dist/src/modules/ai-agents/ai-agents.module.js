"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAgentsModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("../audit/audit.module");
const prisma_module_1 = require("../prisma/prisma.module");
const ai_agents_controller_1 = require("./ai-agents.controller");
const ai_agents_service_1 = require("./ai-agents.service");
let AiAgentsModule = class AiAgentsModule {
};
exports.AiAgentsModule = AiAgentsModule;
exports.AiAgentsModule = AiAgentsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, audit_module_1.AuditModule],
        providers: [ai_agents_service_1.AiAgentsService],
        controllers: [ai_agents_controller_1.AiAgentsController],
        exports: [ai_agents_service_1.AiAgentsService],
    })
], AiAgentsModule);
//# sourceMappingURL=ai-agents.module.js.map