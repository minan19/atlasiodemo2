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
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MetricsService = class MetricsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.maxRecords = 1000;
        this.records = [];
    }
    record(entry) {
        this.records.push({ ...entry, at: new Date().toISOString() });
        if (this.records.length > this.maxRecords)
            this.records.shift();
    }
    async snapshot() {
        const recent = [...this.records];
        const durations = recent.map((row) => row.durationMs).sort((a, b) => a - b);
        const p50 = durations.length ? durations[Math.floor(durations.length * 0.5)] : 0;
        const p95 = durations.length ? durations[Math.floor(durations.length * 0.95)] : 0;
        const last15m = new Date(Date.now() - 15 * 60 * 1000);
        const [activeUsers, totalCourses, publishedCourses] = await Promise.all([
            this.prisma.auditLog.count({
                where: {
                    action: 'auth.login',
                    createdAt: { gte: last15m },
                    actorId: { not: null },
                },
            }),
            this.prisma.course.count(),
            this.prisma.course.count({ where: { isPublished: true } }),
        ]);
        return {
            requestCount: recent.length,
            p50Ms: p50,
            p95Ms: p95,
            activeUsers15m: activeUsers,
            courseTotals: { total: totalCourses, published: publishedCourses },
            tail: recent.slice(-30),
        };
    }
    async ltiMetrics() {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [toolCount, activeDeployments, recentLaunches] = await Promise.all([
            this.prisma.ltiTool.count(),
            this.prisma.ltiDeployment.count({ where: { status: 'ACTIVE' } }),
            this.prisma.ltiLaunch.count({ where: { createdAt: { gte: since } } }),
        ]);
        return {
            toolCount,
            activeDeployments,
            launchesLast24h: recentLaunches,
        };
    }
    async aiMetrics() {
        const since = new Date(Date.now() - 60 * 60 * 1000);
        const [activeAgents, logs, summaries] = await Promise.all([
            this.prisma.aiAgentProfile.count({ where: { status: 'ACTIVE' } }),
            this.prisma.aiAgentLog.count({ where: { createdAt: { gte: since } } }),
            this.prisma.aiAgentLog.count({ where: { type: 'SUMMARY' } }),
        ]);
        return {
            activeAgents,
            logsLastHour: logs,
            summariesTotal: summaries,
        };
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MetricsService);
//# sourceMappingURL=metrics.service.js.map