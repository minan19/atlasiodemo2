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
exports.PerformanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const crypto_1 = require("crypto");
let PerformanceService = class PerformanceService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async captureAggregate(actorId) {
        const now = new Date();
        const [enrollmentCount, activeCourses, lessonCount, aiLogsLastHour, ltiLaunches24h] = await Promise.all([
            this.prisma.enrollment.count(),
            this.prisma.course.count({ where: { isPublished: true } }),
            this.prisma.lessonContent.count(),
            this.prisma.aiAgentLog.count({ where: { createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } }),
            this.prisma.ltiLaunch.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
        ]);
        const metrics = {
            enrollmentCount,
            activeCourses,
            lessonCount,
            aiLogsLastHour,
            ltiLaunches24h,
            recordedAt: now.toISOString(),
        };
        const snapshot = await this.prisma.performanceSnapshot.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                userId: actorId ?? null,
                context: 'automation:aggregate',
                metrics,
                notes: 'Scheduled performance capture',
            },
        });
        await this.audit.log({
            action: 'performance.snapshot',
            entity: 'PerformanceSnapshot',
            entityId: snapshot.id,
            actorId,
            meta: { metrics },
        });
        return snapshot;
    }
    async list(limit = 20) {
        const snapshots = await this.prisma.performanceSnapshot.findMany({
            orderBy: { recordedAt: 'desc' },
            take: limit,
        });
        return snapshots;
    }
};
exports.PerformanceService = PerformanceService;
exports.PerformanceService = PerformanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], PerformanceService);
//# sourceMappingURL=performance.service.js.map