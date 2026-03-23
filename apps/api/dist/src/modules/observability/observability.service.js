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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ObservabilityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_provider_1 = require("../../infra/redis/redis.provider");
let ObservabilityService = ObservabilityService_1 = class ObservabilityService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = new common_1.Logger(ObservabilityService_1.name);
    }
    createTrace(service, operation, parentTraceId) {
        return {
            traceId: parentTraceId ?? (0, crypto_1.randomUUID)(),
            spanId: (0, crypto_1.randomUUID)(),
            parentSpanId: parentTraceId ? (0, crypto_1.randomUUID)() : undefined,
            service,
            operation,
            startTime: Date.now(),
            status: 'ok',
        };
    }
    async completeTrace(trace, status = 'ok', metadata) {
        trace.endTime = Date.now();
        trace.durationMs = trace.endTime - trace.startTime;
        trace.status = status;
        trace.metadata = metadata;
        try {
            await this.redis.set(`trace:${trace.traceId}:${trace.spanId}`, JSON.stringify(trace), 'EX', 86400);
            const bucket = this.getLatencyBucket(trace.durationMs);
            await this.redis.hincrby(`latency:${trace.service}:${trace.operation}`, bucket, 1);
            await this.redis.expire(`latency:${trace.service}:${trace.operation}`, 86400);
        }
        catch {
        }
        if (trace.durationMs > 2000) {
            this.logger.warn(`Slow request: ${trace.service}.${trace.operation} took ${trace.durationMs}ms [traceId=${trace.traceId}]`);
        }
        return trace;
    }
    getLatencyBucket(ms) {
        if (ms < 50)
            return 'p50_under';
        if (ms < 200)
            return 'p200_under';
        if (ms < 500)
            return 'p500_under';
        if (ms < 1000)
            return 'p1000_under';
        if (ms < 2000)
            return 'p2000_under';
        return 'p2000_over';
    }
    async recordMetric(name, value, tags) {
        try {
            const key = `metric:${name}:${new Date().toISOString().slice(0, 13)}`;
            await this.redis.lpush(key, JSON.stringify({ value, tags, ts: Date.now() }));
            await this.redis.ltrim(key, 0, 999);
            await this.redis.expire(key, 7 * 86400);
        }
        catch {
        }
    }
    async getLatencyDistribution(service, operation) {
        try {
            const data = await this.redis.hgetall(`latency:${service}:${operation}`);
            return {
                service,
                operation,
                distribution: data,
                timestamp: new Date().toISOString(),
            };
        }
        catch {
            return { service, operation, distribution: {}, timestamp: new Date().toISOString() };
        }
    }
    async checkDrift(tenantId) {
        const alerts = [];
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
                        id: (0, crypto_1.randomUUID)(),
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
                    id: (0, crypto_1.randomUUID)(),
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
    async computeHealthScore() {
        const details = {};
        let apiScore = 100;
        const apiIssues = [];
        try {
            const start = Date.now();
            await this.prisma.user.count();
            const dbLatency = Date.now() - start;
            if (dbLatency > 500) {
                apiScore -= 20;
                apiIssues.push(`DB query latency: ${dbLatency}ms`);
            }
            if (dbLatency > 1000) {
                apiScore -= 20;
                apiIssues.push('DB response critically slow');
            }
        }
        catch (e) {
            apiScore = 0;
            apiIssues.push('Database unreachable');
        }
        details.api = { score: apiScore, issues: apiIssues };
        let dbScore = 100;
        const dbIssues = [];
        try {
            const userCount = await this.prisma.user.count();
            if (userCount === 0) {
                dbScore -= 10;
                dbIssues.push('No users in database');
            }
        }
        catch {
            dbScore = 0;
            dbIssues.push('Database connection failed');
        }
        details.database = { score: dbScore, issues: dbIssues };
        let redisScore = 100;
        const redisIssues = [];
        try {
            const pong = await this.redis.ping();
            if (pong !== 'PONG') {
                redisScore -= 50;
                redisIssues.push('Redis ping failed');
            }
        }
        catch {
            redisScore = 0;
            redisIssues.push('Redis unreachable');
        }
        details.redis = { score: redisScore, issues: redisIssues };
        let aiScore = 100;
        const aiIssues = [];
        const recentAiMetrics = await this.prisma.aIMetric.count({
            where: { createdAt: { gte: new Date(Date.now() - 86400 * 1000) } },
        }).catch(() => 0);
        if (recentAiMetrics === 0) {
            aiScore -= 20;
            aiIssues.push('No AI metrics in last 24h');
        }
        details.ai = { score: aiScore, issues: aiIssues };
        let secScore = 100;
        const secIssues = [];
        const criticalEvents = await this.prisma.securityEvent.count({
            where: {
                severity: 'CRITICAL',
                status: 'OPEN',
                createdAt: { gte: new Date(Date.now() - 86400 * 1000) },
            },
        }).catch(() => 0);
        if (criticalEvents > 0) {
            secScore -= 30;
            secIssues.push(`${criticalEvents} open critical security events`);
        }
        details.security = { score: secScore, issues: secIssues };
        const overall = Math.round((apiScore + dbScore + redisScore + aiScore + secScore) / 5);
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
    async generateComplianceReport(tenantId, days = 30) {
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
    async getTenantDashboard(tenantId) {
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
};
exports.ObservabilityService = ObservabilityService;
exports.ObservabilityService = ObservabilityService = ObservabilityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(redis_provider_1.REDIS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Function])
], ObservabilityService);
//# sourceMappingURL=observability.service.js.map