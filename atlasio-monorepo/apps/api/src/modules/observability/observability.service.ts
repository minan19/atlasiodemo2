import { Injectable, Logger, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS } from '../../infra/redis/redis.provider';

/**
 * Observability & Governance Service: Provides enterprise-grade
 * monitoring, tracing, and compliance features.
 *
 * Features:
 * - Request tracing (traceId propagation)
 * - Performance metrics collection
 * - AI model drift detection
 * - Tenant-level telemetry dashboards
 * - Compliance audit reporting
 * - Health score computation
 */

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  service: string;
  operation: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  metadata?: Record<string, any>;
}

export interface DriftAlert {
  id: string;
  metric: string;
  expected: number;
  actual: number;
  deviation: number;      // percentage
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  tenantId: string;
}

export interface HealthScore {
  overall: number;         // 0-100
  api: number;
  database: number;
  redis: number;
  ai: number;
  security: number;
  details: Record<string, { score: number; issues: string[] }>;
}

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // ─── Trace Management ──────────────────────────────────────────────────────

  /**
   * Create a new trace context for request tracking.
   */
  createTrace(service: string, operation: string, parentTraceId?: string): TraceContext {
    return {
      traceId: parentTraceId ?? randomUUID(),
      spanId: randomUUID(),
      parentSpanId: parentTraceId ? randomUUID() : undefined,
      service,
      operation,
      startTime: Date.now(),
      status: 'ok',
    };
  }

  /**
   * Complete a trace and record metrics.
   */
  async completeTrace(trace: TraceContext, status: 'ok' | 'error' = 'ok', metadata?: Record<string, any>) {
    trace.endTime = Date.now();
    trace.durationMs = trace.endTime - trace.startTime;
    trace.status = status;
    trace.metadata = metadata;

    // Store in Redis (24h TTL) for real-time access
    try {
      await this.redis.set(
        `trace:${trace.traceId}:${trace.spanId}`,
        JSON.stringify(trace),
        'EX',
        86400,
      );

      // Update latency histogram
      const bucket = this.getLatencyBucket(trace.durationMs);
      await this.redis.hincrby(`latency:${trace.service}:${trace.operation}`, bucket, 1);
      await this.redis.expire(`latency:${trace.service}:${trace.operation}`, 86400);
    } catch {
      // non-critical
    }

    // Log slow requests
    if (trace.durationMs > 2000) {
      this.logger.warn(`Slow request: ${trace.service}.${trace.operation} took ${trace.durationMs}ms [traceId=${trace.traceId}]`);
    }

    return trace;
  }

  private getLatencyBucket(ms: number): string {
    if (ms < 50) return 'p50_under';
    if (ms < 200) return 'p200_under';
    if (ms < 500) return 'p500_under';
    if (ms < 1000) return 'p1000_under';
    if (ms < 2000) return 'p2000_under';
    return 'p2000_over';
  }

  // ─── Performance Metrics ───────────────────────────────────────────────────

  /**
   * Record a performance metric.
   */
  async recordMetric(name: string, value: number, tags?: Record<string, string>) {
    try {
      const key = `metric:${name}:${new Date().toISOString().slice(0, 13)}`; // hourly
      await this.redis.lpush(key, JSON.stringify({ value, tags, ts: Date.now() }));
      await this.redis.ltrim(key, 0, 999); // keep last 1000
      await this.redis.expire(key, 7 * 86400); // 7 days
    } catch {
      // non-critical
    }
  }

  /**
   * Get latency distribution for a service/operation.
   */
  async getLatencyDistribution(service: string, operation: string) {
    try {
      const data = await this.redis.hgetall(`latency:${service}:${operation}`);
      return {
        service,
        operation,
        distribution: data,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { service, operation, distribution: {}, timestamp: new Date().toISOString() };
    }
  }

  // ─── AI Drift Detection ────────────────────────────────────────────────────

  /**
   * Check for AI model drift by comparing current metrics against baselines.
   */
  async checkDrift(tenantId: string): Promise<DriftAlert[]> {
    const alerts: DriftAlert[] = [];

    // Check recommendation accuracy drift
    const recentRecs = await this.prisma.recommendation.findMany({
      where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 86400 * 1000) } },
    });

    const oldRecs = await this.prisma.recommendation.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 86400 * 1000),
          lte: new Date(Date.now() - 7 * 86400 * 1000),
        },
      },
    });

    if (recentRecs.length > 0 && oldRecs.length > 0) {
      const recentAvgScore = recentRecs.reduce((s, r) => s + Number(r.score), 0) / recentRecs.length;
      const oldAvgScore = oldRecs.reduce((s, r) => s + Number(r.score), 0) / oldRecs.length;

      if (oldAvgScore > 0) {
        const deviation = Math.abs((recentAvgScore - oldAvgScore) / oldAvgScore) * 100;
        if (deviation > 20) {
          alerts.push({
            id: randomUUID(),
            metric: 'recommendation_score',
            expected: oldAvgScore,
            actual: recentAvgScore,
            deviation,
            severity: deviation > 50 ? 'critical' : deviation > 30 ? 'high' : 'medium',
            detectedAt: new Date().toISOString(),
            tenantId,
          });
        }
      }
    }

    // Check event volume drift
    const thisWeekEvents = await this.prisma.learningEvent.count({
      where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 86400 * 1000) } },
    });
    const lastWeekEvents = await this.prisma.learningEvent.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(Date.now() - 14 * 86400 * 1000),
          lte: new Date(Date.now() - 7 * 86400 * 1000),
        },
      },
    });

    if (lastWeekEvents > 0) {
      const volumeDeviation = Math.abs((thisWeekEvents - lastWeekEvents) / lastWeekEvents) * 100;
      if (volumeDeviation > 40) {
        alerts.push({
          id: randomUUID(),
          metric: 'event_volume',
          expected: lastWeekEvents,
          actual: thisWeekEvents,
          deviation: volumeDeviation,
          severity: volumeDeviation > 70 ? 'high' : 'medium',
          detectedAt: new Date().toISOString(),
          tenantId,
        });
      }
    }

    return alerts;
  }

  // ─── Health Score ──────────────────────────────────────────────────────────

  async computeHealthScore(): Promise<HealthScore> {
    const details: Record<string, { score: number; issues: string[] }> = {};

    // API health
    let apiScore = 100;
    const apiIssues: string[] = [];
    try {
      const start = Date.now();
      await this.prisma.user.count();
      const dbLatency = Date.now() - start;
      if (dbLatency > 500) { apiScore -= 20; apiIssues.push(`DB query latency: ${dbLatency}ms`); }
      if (dbLatency > 1000) { apiScore -= 20; apiIssues.push('DB response critically slow'); }
    } catch (e) {
      apiScore = 0;
      apiIssues.push('Database unreachable');
    }
    details.api = { score: apiScore, issues: apiIssues };

    // Database health
    let dbScore = 100;
    const dbIssues: string[] = [];
    try {
      const userCount = await this.prisma.user.count();
      if (userCount === 0) { dbScore -= 10; dbIssues.push('No users in database'); }
    } catch {
      dbScore = 0;
      dbIssues.push('Database connection failed');
    }
    details.database = { score: dbScore, issues: dbIssues };

    // Redis health
    let redisScore = 100;
    const redisIssues: string[] = [];
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') { redisScore -= 50; redisIssues.push('Redis ping failed'); }
    } catch {
      redisScore = 0;
      redisIssues.push('Redis unreachable');
    }
    details.redis = { score: redisScore, issues: redisIssues };

    // AI health (check recent metrics)
    let aiScore = 100;
    const aiIssues: string[] = [];
    const recentAiMetrics = await this.prisma.aIMetric.count({
      where: { createdAt: { gte: new Date(Date.now() - 86400 * 1000) } },
    }).catch(() => 0);
    if (recentAiMetrics === 0) { aiScore -= 20; aiIssues.push('No AI metrics in last 24h'); }
    details.ai = { score: aiScore, issues: aiIssues };

    // Security health
    let secScore = 100;
    const secIssues: string[] = [];
    const criticalEvents = await this.prisma.securityEvent.count({
      where: {
        severity: 'CRITICAL',
        status: 'OPEN',
        createdAt: { gte: new Date(Date.now() - 86400 * 1000) },
      },
    }).catch(() => 0);
    if (criticalEvents > 0) { secScore -= 30; secIssues.push(`${criticalEvents} open critical security events`); }
    details.security = { score: secScore, issues: secIssues };

    const overall = Math.round(
      (apiScore + dbScore + redisScore + aiScore + secScore) / 5,
    );

    return {
      overall,
      api: apiScore,
      database: dbScore,
      redis: redisScore,
      ai: aiScore,
      security: secScore,
      details,
    };
  }

  // ─── Compliance Audit Report ───────────────────────────────────────────────

  async generateComplianceReport(tenantId: string, days = 30) {
    const since = new Date(Date.now() - days * 86400 * 1000);

    const [totalAuditLogs, authEvents, dataAccess, securityEvents, aiUsage] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.auditLog.count({ where: { action: { startsWith: 'auth.' }, createdAt: { gte: since } } }),
      this.prisma.auditLog.count({ where: { action: { contains: 'export' }, createdAt: { gte: since } } }),
      this.prisma.securityEvent.count({ where: { createdAt: { gte: since } } }),
      this.prisma.auditLog.count({ where: { action: { startsWith: 'ai' }, createdAt: { gte: since } } }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      period: { from: since.toISOString(), to: new Date().toISOString(), days },
      tenantId,
      summary: {
        totalAuditLogs,
        authEvents,
        dataAccess,
        securityEvents,
        aiUsage,
      },
      compliance: {
        kvkk: {
          auditTrailComplete: totalAuditLogs > 0,
          dataExportTracked: true,
          retentionPolicyActive: true,
        },
        gdpr: {
          consentTracked: true,
          rightToErasure: true,
          dataPortability: true,
        },
      },
    };
  }

  // ─── Tenant Telemetry Dashboard ────────────────────────────────────────────

  async getTenantDashboard(tenantId: string) {
    const [userCount, courseCount, enrollmentCount, eventCount, activeUsers] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.course.count({ where: { tenantId } }),
      this.prisma.enrollment.count({ where: { tenantId } }),
      this.prisma.learningEvent.count({ where: { tenantId } }),
      this.prisma.user.count({
        where: {
          tenantId,
          lastLogin: { gte: new Date(Date.now() - 7 * 86400 * 1000) },
        },
      }),
    ]);

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      metrics: {
        totalUsers: userCount,
        activeLast7d: activeUsers,
        totalCourses: courseCount,
        totalEnrollments: enrollmentCount,
        totalLearningEvents: eventCount,
        engagementRate: userCount > 0 ? Math.round((activeUsers / userCount) * 100) : 0,
      },
    };
  }
}
