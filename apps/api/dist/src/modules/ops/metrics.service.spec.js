"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const metrics_service_1 = require("./metrics.service");
describe('MetricsService', () => {
    let service;
    beforeEach(() => {
        const prisma = {
            auditLog: { count: jest.fn().mockResolvedValue(2) },
            course: {
                count: jest
                    .fn()
                    .mockResolvedValueOnce(10)
                    .mockResolvedValueOnce(6),
            },
        };
        service = new metrics_service_1.MetricsService(prisma);
    });
    it('builds snapshot with latency percentiles', async () => {
        service.record({
            requestId: '1',
            route: '/health',
            method: 'GET',
            statusCode: 200,
            durationMs: 40,
        });
        service.record({
            requestId: '2',
            route: '/courses/published',
            method: 'GET',
            statusCode: 200,
            durationMs: 120,
        });
        const result = await service.snapshot();
        expect(result.requestCount).toBe(2);
        expect(result.p95Ms).toBeGreaterThanOrEqual(result.p50Ms);
        expect(result.courseTotals.total).toBe(10);
        expect(result.courseTotals.published).toBe(6);
    });
});
//# sourceMappingURL=metrics.service.spec.js.map