import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type StreamPayload = {
  userId?: string;
  courseId?: string;
  lessonId?: string;
  liveSessionId?: string;
  watchSeconds?: number;
  rebufferCount?: number;
  avgBitrateKbps?: number;
  droppedFrames?: number;
  device?: any;
  network?: any;
  tenantId?: string;
};

@Injectable()
export class TelemetryService {
  constructor(private readonly prisma: PrismaService) {}

  async recordStream(payload: StreamPayload) {
    if (!payload.watchSeconds && !payload.rebufferCount) {
      throw new BadRequestException('watchSeconds or rebufferCount required');
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
    // basit özet: toplam izleme süresi, ortalama bitrate, en çok izlenen 5 kurs
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
    const avgBitrate =
      agg._count > 0 && agg._sum.avgBitrateKbps
        ? Math.round((agg._sum.avgBitrateKbps) / agg._count)
        : 0;

    return {
      generatedAt: new Date().toISOString(),
      totalRecords: agg._count,
      totalWatchSeconds: totalWatch,
      avgBitrateKbps: avgBitrate,
      totalRebuffers: agg._sum.rebufferCount ?? 0,
      topCourses: topCourses.map((c: any) => ({
        courseId: c.courseId,
        watchSeconds: c._sum?.watchSeconds ?? 0,
        avgBitrateKbps: c._avg?.avgBitrateKbps ? Math.round(c._avg.avgBitrateKbps) : null,
        hits:
          typeof c._count === 'object' && (c._count)?._all
            ? (c._count)._all
            : 0,
      })),
      charts: {
        topCoursesBar: {
          labels: topCourses.map((c: any) => c.courseId ?? 'unknown'),
          data: topCourses.map((c: any) => c._sum?.watchSeconds ?? 0),
        },
      },
    };
  }
}
