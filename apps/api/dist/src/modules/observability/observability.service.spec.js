"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const observability_service_1 = require("./observability.service");
const makeRedis = () => ({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    hgetall: jest.fn().mockResolvedValue({}),
    hincrby: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    lpush: jest.fn().mockResolvedValue(1),
    ltrim: jest.fn().mockResolvedValue('OK'),
    ping: jest.fn().mockResolvedValue('PONG'),
});
const makePrisma = () => ({
    user: { count: jest.fn().mockResolvedValue(5) },
    course: { count: jest.fn().mockResolvedValue(3) },
    enrollment: { count: jest.fn().mockResolvedValue(10) },
    learningEvent: {
        count: jest.fn().mockResolvedValue(50),
        findMany: jest.fn().mockResolvedValue([]),
    },
    recommendation: {
        findMany: jest.fn().mockResolvedValue([]),
    },
    aIMetric: { count: jest.fn().mockResolvedValue(5) },
    securityEvent: { count: jest.fn().mockResolvedValue(0) },
    auditLog: { count: jest.fn().mockResolvedValue(100) },
    $transaction: jest.fn(async (fns) => fns.map(() => 0)),
});
function buildService(redisOv = {}) {
    const prisma = makePrisma();
    const redis = { ...makeRedis(), ...redisOv };
    return { service: new observability_service_1.ObservabilityService(prisma, redis), prisma, redis };
}
describe('ObservabilityService.createTrace', () => {
    it('yeni trace context oluşturur', () => {
        const { service } = buildService();
        const trace = service.createTrace('api', 'courses.list');
        expect(trace.traceId).toBeDefined();
        expect(trace.spanId).toBeDefined();
        expect(trace.service).toBe('api');
        expect(trace.operation).toBe('courses.list');
        expect(trace.status).toBe('ok');
    });
    it('parent traceId verildiğinde kullanır', () => {
        const { service } = buildService();
        const trace = service.createTrace('api', 'courses.get', 'parent-trace-123');
        expect(trace.traceId).toBe('parent-trace-123');
        expect(trace.parentSpanId).toBeDefined();
    });
});
describe('ObservabilityService.completeTrace', () => {
    it('trace tamamlar ve süre hesaplar', async () => {
        const { service, redis } = buildService();
        const trace = service.createTrace('api', 'test.op');
        const completed = await service.completeTrace(trace, 'ok', { userId: 'user-1' });
        expect(completed.endTime).toBeDefined();
        expect(completed.durationMs).toBeGreaterThanOrEqual(0);
        expect(completed.status).toBe('ok');
        expect(redis.set).toHaveBeenCalled();
    });
    it('error status ile tamamlar', async () => {
        const { service } = buildService();
        const trace = service.createTrace('api', 'fail.op');
        const completed = await service.completeTrace(trace, 'error');
        expect(completed.status).toBe('error');
    });
});
describe('ObservabilityService.recordMetric', () => {
    it('metrik kaydeder', async () => {
        const { service, redis } = buildService();
        await service.recordMetric('response_time', 150, { endpoint: '/courses' });
        expect(redis.lpush).toHaveBeenCalled();
    });
    it('Redis hatası olsa bile çökmez', async () => {
        const { service } = buildService({
            lpush: jest.fn().mockRejectedValue(new Error('Redis down')),
        });
        await expect(service.recordMetric('test', 100)).resolves.not.toThrow();
    });
});
describe('ObservabilityService.getLatencyDistribution', () => {
    it('dağılım verisini döner', async () => {
        const { service } = buildService({
            hgetall: jest.fn().mockResolvedValue({
                p50_under: '100',
                p200_under: '50',
                p500_under: '10',
            }),
        });
        const result = await service.getLatencyDistribution('api', 'courses.list');
        expect(result.service).toBe('api');
        expect(result.distribution).toEqual({
            p50_under: '100',
            p200_under: '50',
            p500_under: '10',
        });
    });
});
describe('ObservabilityService.checkDrift', () => {
    it('veri yoksa boş alert listesi döner', async () => {
        const { service } = buildService();
        const alerts = await service.checkDrift('tenant-1');
        expect(alerts).toEqual([]);
    });
});
describe('ObservabilityService.computeHealthScore', () => {
    it('sağlık skoru hesaplar', async () => {
        const { service } = buildService();
        const health = await service.computeHealthScore();
        expect(health.overall).toBeGreaterThanOrEqual(0);
        expect(health.overall).toBeLessThanOrEqual(100);
        expect(health.api).toBeDefined();
        expect(health.database).toBeDefined();
        expect(health.redis).toBeDefined();
        expect(health.ai).toBeDefined();
        expect(health.security).toBeDefined();
        expect(health.details).toBeDefined();
    });
    it('Redis down olduğunda düşük redis skoru döner', async () => {
        const { service } = buildService({
            ping: jest.fn().mockRejectedValue(new Error('Connection refused')),
        });
        const health = await service.computeHealthScore();
        expect(health.redis).toBe(0);
        expect(health.details.redis.issues).toContain('Redis unreachable');
    });
});
describe('ObservabilityService.generateComplianceReport', () => {
    it('uyumluluk raporu oluşturur', async () => {
        const { service, prisma } = buildService();
        prisma.$transaction.mockResolvedValue([100, 30, 5, 2, 10]);
        const report = await service.generateComplianceReport('tenant-1', 30);
        expect(report.tenantId).toBe('tenant-1');
        expect(report.period.days).toBe(30);
        expect(report.summary).toBeDefined();
        expect(report.compliance.kvkk).toBeDefined();
        expect(report.compliance.gdpr).toBeDefined();
    });
});
describe('ObservabilityService.getTenantDashboard', () => {
    it('tenant dashboard verisini döner', async () => {
        const { service, prisma } = buildService();
        prisma.$transaction.mockResolvedValue([10, 5, 20, 100, 8]);
        const dashboard = await service.getTenantDashboard('tenant-1');
        expect(dashboard.tenantId).toBe('tenant-1');
        expect(dashboard.metrics).toBeDefined();
        expect(dashboard.generatedAt).toBeDefined();
    });
});
//# sourceMappingURL=observability.service.spec.js.map