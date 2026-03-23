import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type RequestMetric = {
  at: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
};

@Injectable()
export class MetricsService {
  private readonly maxRecords = 1000;
  private readonly records: RequestMetric[] = [];

  constructor(private readonly prisma: PrismaService) {}

  record(entry: Omit<RequestMetric, 'at'>) {
    this.records.push({ ...entry, at: new Date().toISOString() });
    if (this.records.length > this.maxRecords) this.records.shift();
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
}
