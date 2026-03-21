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
exports.SecuritySummaryController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SecuritySummaryController = class SecuritySummaryController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async summary() {
        const [events24h, openActions] = await this.prisma.$transaction([
            this.prisma.securityEvent.groupBy({
                by: ['severity'],
                where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                orderBy: { severity: 'asc' },
                _count: { _all: true },
            }),
            this.prisma.defenseAction.groupBy({
                by: ['state'],
                orderBy: { state: 'asc' },
                _count: { _all: true },
            }),
        ]);
        const sevCounts = Object.fromEntries(events24h.map((e) => [e.severity, typeof e._count === 'object' && e._count?._all ? e._count._all : 0]));
        const actionCounts = Object.fromEntries(openActions.map((a) => [a.state, typeof a._count === 'object' && a._count?._all ? a._count._all : 0]));
        return {
            generatedAt: new Date().toISOString(),
            events24h: sevCounts,
            defenseActions: actionCounts,
        };
    }
};
exports.SecuritySummaryController = SecuritySummaryController;
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SecuritySummaryController.prototype, "summary", null);
exports.SecuritySummaryController = SecuritySummaryController = __decorate([
    (0, common_1.Controller)('security'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SecuritySummaryController);
//# sourceMappingURL=summary.controller.js.map