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
exports.EntitlementModule = exports.EntitlementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EntitlementService = class EntitlementService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTenantModules(tenantId) {
        if (tenantId === 'public') {
            return {
                LIVE_CLASSES: true,
                WHITEBOARD_ADVANCED: true,
                AI_GHOST_MENTOR: true,
                ADAPTIVE_EXAMS: true,
                CUSTOM_REPORTS: true,
                LTI_INTEGRATION: true,
            };
        }
        const sub = await this.prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' },
            include: { PricePlan: true },
        });
        if (!sub || !sub.PricePlan?.features) {
            return {};
        }
        const baseFeatures = sub.PricePlan.features || {};
        const addonFeatures = sub.addons || [];
        for (const addon of addonFeatures) {
            baseFeatures[addon] = true;
        }
        return baseFeatures;
    }
    async grantAddonModule(tenantId, moduleName) {
        const sub = await this.prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' },
        });
        if (!sub)
            return null;
        const currentAddons = sub.addons || [];
        if (!currentAddons.includes(moduleName)) {
            currentAddons.push(moduleName);
        }
        return this.prisma.subscription.update({
            where: { id: sub.id },
            data: { addons: currentAddons },
        });
    }
    async checkSeatAvailability(tenantId) {
        const sub = await this.prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' },
        });
        if (!sub)
            return false;
        if (sub.seats === -1)
            return true;
        return sub.usedSeats < sub.seats;
    }
    async allocateSeat(tenantId) {
        const sub = await this.prisma.subscription.findFirst({
            where: { tenantId, status: 'ACTIVE' },
        });
        if (!sub)
            return false;
        await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { usedSeats: { increment: 1 } }
        });
        return true;
    }
};
exports.EntitlementService = EntitlementService;
exports.EntitlementService = EntitlementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EntitlementService);
let EntitlementModule = class EntitlementModule {
};
exports.EntitlementModule = EntitlementModule;
exports.EntitlementModule = EntitlementModule = __decorate([
    (0, common_1.Module)({
        providers: [EntitlementService, prisma_service_1.PrismaService],
        exports: [EntitlementService],
    })
], EntitlementModule);
//# sourceMappingURL=entitlement.service.js.map