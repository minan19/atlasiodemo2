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
exports.TelemetryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TelemetryService = class TelemetryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordStream(payload) {
        if (!payload.watchSeconds && !payload.rebufferCount) {
            throw new common_1.BadRequestException('watchSeconds or rebufferCount required');
        }
        const data = {
            userId: payload.userId ?? null,
            courseId: payload.courseId ?? null,
            lessonId: payload.lessonId ?? null,
            liveSessionId: payload.liveSessionId ?? null,
            watchSeconds: Math.max(0, Math.trunc(payload.watchSeconds ?? 0)),
            rebufferCount: Math.max(0, Math.trunc(payload.rebufferCount ?? 0)),
            avgBitrateKbps: payload.avgBitrateKbps ? Math.max(0, Math.trunc(payload.avgBitrateKbps)) : null,
            droppedFrames: payload.droppedFrames ? Math.max(0, Math.trunc(payload.droppedFrames)) : null,
            device: payload.device ?? null,
            network: payload.network ?? null,
            tenantId: payload.tenantId ?? 'public',
        };
        return this.prisma.streamMetric.create({ data });
    }
    async streamInsights(tenantId = 'public') {
        const [agg, topCourses] = await this.prisma.$transaction([
            this.prisma.streamMetric.aggregate({
                where: { tenantId },
                _sum: { watchSeconds: true, rebufferCount: true, avgBitrateKbps: true },
                _count: true,
            }),
            this.prisma.streamMetric.groupBy({
                by: ['courseId'],
                where: { tenantId },
                _sum: { watchSeconds: true },
                _avg: { avgBitrateKbps: true },
                _count: { _all: true },
                orderBy: { _sum: { watchSeconds: 'desc' } },
                take: 5,
            }),
        ]);
        const totalWatch = agg._sum.watchSeconds ?? 0;
        const avgBitrate = agg._count > 0 && agg._sum.avgBitrateKbps
            ? Math.round((agg._sum.avgBitrateKbps) / agg._count)
            : 0;
        return {
            generatedAt: new Date().toISOString(),
            totalRecords: agg._count,
            totalWatchSeconds: totalWatch,
            avgBitrateKbps: avgBitrate,
            totalRebuffers: agg._sum.rebufferCount ?? 0,
            topCourses: topCourses.map((c) => ({
                courseId: c.courseId,
                watchSeconds: c._sum?.watchSeconds ?? 0,
                avgBitrateKbps: c._avg?.avgBitrateKbps ? Math.round(c._avg.avgBitrateKbps) : null,
                hits: typeof c._count === 'object' && (c._count)?._all
                    ? (c._count)._all
                    : 0,
            })),
            charts: {
                topCoursesBar: {
                    labels: topCourses.map((c) => c.courseId ?? 'unknown'),
                    data: topCourses.map((c) => c._sum?.watchSeconds ?? 0),
                },
            },
        };
    }
};
exports.TelemetryService = TelemetryService;
exports.TelemetryService = TelemetryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TelemetryService);
//# sourceMappingURL=telemetry.service.js.map