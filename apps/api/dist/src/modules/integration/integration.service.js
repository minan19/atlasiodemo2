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
exports.IntegrationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let IntegrationService = class IntegrationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listConnectors(tenantId) {
        return this.prisma.integrationConnector.findMany({ where: { tenantId } });
    }
    async upsertConnector(tenantId, data) {
        return this.prisma.integrationConnector.upsert({
            where: { tenantId_name: { tenantId, name: data.name } },
            create: {
                tenantId,
                name: data.name,
                provider: data.provider,
                type: data.type,
                config: data.config,
                enabled: data.enabled ?? true,
            },
            update: {
                provider: data.provider,
                type: data.type,
                config: data.config,
                enabled: data.enabled ?? true,
            },
        });
    }
};
exports.IntegrationService = IntegrationService;
exports.IntegrationService = IntegrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IntegrationService);
//# sourceMappingURL=integration.service.js.map