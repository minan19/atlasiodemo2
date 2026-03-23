"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_stream_service_1 = require("./event-stream.service");
const makeRedis = () => ({
    xadd: jest.fn().mockResolvedValue('stream-id'),
    hincrby: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    hgetall: jest.fn().mockResolvedValue({}),
});
const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });
const makePrisma = () => ({
    learningEvent: {
        create: jest.fn().mockResolvedValue({ id: 'evt-1', tenantId: 'public', eventType: 'CONTENT_VIEWED', createdAt: new Date() }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn(async (fns) => fns.map(() => [])),
});
function buildService(redisOv = {}) {
    const prisma = makePrisma();
    const audit = makeAudit();
    const redis = { ...makeRedis(), ...redisOv };
    return { service: new event_stream_service_1.EventStreamService(prisma, audit, redis), prisma, redis };
}
describe('EventStreamService.emit', () => {
    it('event kaydeder ve Redis stream\'e publish eder', async () => {
        const { service, prisma, redis } = buildService();
        const result = await service.emit({
            tenantId: 'tenant-1',
            userId: 'user-1',
            eventType: 'CONTENT_VIEWED',
            objectType: 'lesson',
            objectId: 'lesson-1',
            objectName: 'İlk Ders',
        });
        expect(result.id).toBeDefined();
        expect(result.verb).toBe('viewed');
        expect(result.tenantId).toBe('tenant-1');
        expect(prisma.learningEvent.create).toHaveBeenCalledTimes(1);
        expect(redis.xadd).toHaveBeenCalledTimes(1);
    });
    it('Redis hatası olsa bile event kaydeder', async () => {
        const { service, prisma } = buildService({
            xadd: jest.fn().mockRejectedValue(new Error('Redis down')),
        });
        const result = await service.emit({
            tenantId: 'tenant-1',
            eventType: 'QUIZ_ANSWERED',
            objectType: 'quiz',
            objectId: 'quiz-1',
        });
        expect(result.id).toBeDefined();
        expect(prisma.learningEvent.create).toHaveBeenCalledTimes(1);
    });
});
describe('EventStreamService.toXApiStatement', () => {
    it('geçerli xAPI statement üretir', () => {
        const { service } = buildService();
        const event = {
            id: 'test-id',
            tenantId: 'tenant-1',
            userId: 'user-1',
            eventType: 'CONTENT_VIEWED',
            verb: 'viewed',
            objectType: 'lesson',
            objectId: 'lesson-1',
            objectName: 'Test Lesson',
            timestamp: new Date().toISOString(),
        };
        const statement = service.toXApiStatement(event, 'user@example.com');
        expect(statement.id).toBe('test-id');
        expect(statement.actor.mbox).toBe('mailto:user@example.com');
        expect(statement.verb.id).toContain('viewed');
        expect(statement.object.objectType).toBe('Activity');
        expect(statement.timestamp).toBeDefined();
    });
});
describe('EventStreamService.toCaliperEvent', () => {
    it('geçerli Caliper event üretir', () => {
        const { service } = buildService();
        const event = {
            id: 'test-id',
            tenantId: 'tenant-1',
            userId: 'user-1',
            eventType: 'LIVE_JOIN',
            verb: 'joined',
            objectType: 'live_session',
            objectId: 'session-1',
            timestamp: new Date().toISOString(),
        };
        const caliper = service.toCaliperEvent(event);
        expect(caliper['@context']).toContain('caliper');
        expect(caliper.type).toBe('SessionEvent');
        expect(caliper.action).toBe('LoggedIn');
        expect(caliper.actor.type).toBe('Person');
    });
});
describe('EventStreamService.getRealtimeCounts', () => {
    it('Redis\'ten günlük sayıları döner', async () => {
        const { service } = buildService({
            hgetall: jest.fn().mockResolvedValue({ CONTENT_VIEWED: '5', QUIZ_ANSWERED: '3' }),
        });
        const result = await service.getRealtimeCounts('tenant-1');
        expect(result.counts).toEqual({ CONTENT_VIEWED: '5', QUIZ_ANSWERED: '3' });
    });
    it('Redis hatası olursa boş döner', async () => {
        const { service } = buildService({
            hgetall: jest.fn().mockRejectedValue(new Error('Redis down')),
        });
        const result = await service.getRealtimeCounts('tenant-1');
        expect(result.counts).toEqual({});
    });
});
//# sourceMappingURL=event-stream.service.spec.js.map