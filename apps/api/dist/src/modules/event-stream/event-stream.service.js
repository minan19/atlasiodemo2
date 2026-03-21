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
var EventStreamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStreamService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const redis_provider_1 = require("../../infra/redis/redis.provider");
const XAPI_VERBS = {
    viewed: { id: 'http://id.tincanapi.com/verb/viewed', display: { 'en-US': 'viewed' } },
    completed: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } },
    answered: { id: 'http://adlnet.gov/expapi/verbs/answered', display: { 'en-US': 'answered' } },
    submitted: { id: 'http://adlnet.gov/expapi/verbs/attempted', display: { 'en-US': 'submitted' } },
    joined: { id: 'http://activitystrea.ms/schema/1.0/join', display: { 'en-US': 'joined' } },
    chatted: { id: 'http://id.tincanapi.com/verb/replied', display: { 'en-US': 'chatted' } },
    graded: { id: 'http://id.tincanapi.com/verb/graded', display: { 'en-US': 'graded' } },
    dropped_off: { id: 'http://id.tincanapi.com/verb/abandoned', display: { 'en-US': 'abandoned' } },
};
const EVENT_TYPE_TO_VERB = {
    CONTENT_VIEWED: 'viewed',
    VIDEO_DROPOFF: 'dropped_off',
    QUIZ_ANSWERED: 'answered',
    ASSIGNMENT_SUBMITTED: 'submitted',
    LIVE_JOIN: 'joined',
    LIVE_CHAT: 'chatted',
    GRADE_POSTED: 'graded',
    CALIPER_EVENT: 'completed',
};
const CALIPER_ACTIONS = {
    viewed: { type: 'NavigationEvent', action: 'NavigatedTo' },
    completed: { type: 'AssessmentEvent', action: 'Completed' },
    answered: { type: 'AssessmentItemEvent', action: 'Completed' },
    submitted: { type: 'AssignableEvent', action: 'Submitted' },
    joined: { type: 'SessionEvent', action: 'LoggedIn' },
    chatted: { type: 'MessageEvent', action: 'Posted' },
    graded: { type: 'GradeEvent', action: 'Graded' },
    dropped_off: { type: 'MediaEvent', action: 'Paused' },
};
let EventStreamService = EventStreamService_1 = class EventStreamService {
    constructor(prisma, audit, redis, eventEmitter) {
        this.prisma = prisma;
        this.audit = audit;
        this.redis = redis;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(EventStreamService_1.name);
    }
    async emit(params) {
        const verb = EVENT_TYPE_TO_VERB[params.eventType] ?? 'completed';
        const event = {
            id: (0, crypto_1.randomUUID)(),
            tenantId: params.tenantId,
            userId: params.userId,
            eventType: params.eventType,
            verb,
            objectType: params.objectType,
            objectId: params.objectId,
            objectName: params.objectName,
            result: params.result,
            context: params.context,
            timestamp: new Date().toISOString(),
            metadata: params.metadata,
        };
        await this.prisma.learningEvent.create({
            data: {
                tenantId: event.tenantId,
                userId: event.userId,
                eventType: event.eventType,
                payload: {
                    verb: event.verb,
                    objectType: event.objectType,
                    objectId: event.objectId,
                    objectName: event.objectName,
                    result: event.result,
                    context: event.context,
                    metadata: event.metadata,
                },
            },
        });
        try {
            await this.redis.xadd(`events:${event.tenantId}`, '*', 'id', event.id, 'type', event.eventType, 'verb', event.verb, 'userId', event.userId ?? '', 'objectType', event.objectType, 'objectId', event.objectId, 'data', JSON.stringify(event));
        }
        catch (err) {
            this.logger.warn(`Redis stream publish failed: ${err.message}`);
        }
        if (this.eventEmitter) {
            this.eventEmitter.emit('learning.event', event);
            this.eventEmitter.emit(`learning.${event.verb}`, event);
            if (event.eventType === 'QUIZ_ANSWERED') {
                this.eventEmitter.emit('ai.quiz.analyzed', event);
            }
            if (event.eventType === 'VIDEO_DROPOFF' || event.eventType === 'CONTENT_VIEWED') {
                this.eventEmitter.emit('ai.student.risk.evaluated', event);
            }
        }
        try {
            const dayKey = new Date().toISOString().slice(0, 10);
            await this.redis.hincrby(`events:count:${event.tenantId}:${dayKey}`, event.eventType, 1);
            await this.redis.expire(`events:count:${event.tenantId}:${dayKey}`, 90 * 24 * 60 * 60);
        }
        catch {
        }
        return event;
    }
    toXApiStatement(event, actorEmail) {
        const verb = XAPI_VERBS[event.verb] ?? XAPI_VERBS.completed;
        const baseIri = process.env.XAPI_BASE_IRI ?? 'https://atlasio.com/xapi';
        return {
            id: event.id,
            actor: {
                objectType: 'Agent',
                ...(actorEmail ? { mbox: `mailto:${actorEmail}` } : {}),
                account: event.userId ? { homePage: baseIri, name: event.userId } : undefined,
            },
            verb,
            object: {
                objectType: 'Activity',
                id: `${baseIri}/activities/${event.objectType}/${event.objectId}`,
                definition: {
                    type: `${baseIri}/activity-types/${event.objectType}`,
                    name: event.objectName ? { 'en-US': event.objectName } : undefined,
                },
            },
            result: event.result ? {
                score: event.result.score ? {
                    raw: event.result.score.raw,
                    min: event.result.score.min ?? 0,
                    max: event.result.score.max ?? 100,
                    scaled: event.result.score.scaled,
                } : undefined,
                success: event.result.success,
                completion: event.result.completion,
                duration: event.result.duration,
                extensions: event.result.extensions,
            } : undefined,
            context: {
                registration: event.context?.registrationId,
                contextActivities: event.context?.courseId ? {
                    parent: [{
                            objectType: 'Activity',
                            id: `${baseIri}/activities/course/${event.context.courseId}`,
                        }],
                } : undefined,
                extensions: {
                    [`${baseIri}/extensions/tenantId`]: event.tenantId,
                    ...event.context,
                },
            },
            timestamp: event.timestamp,
            stored: new Date().toISOString(),
        };
    }
    toCaliperEvent(event) {
        const mapping = CALIPER_ACTIONS[event.verb] ?? { type: 'Event', action: 'Used' };
        const baseIri = process.env.CALIPER_BASE_IRI ?? 'https://atlasio.com/caliper';
        return {
            '@context': 'http://purl.imsglobal.org/ctx/caliper/v1p2',
            id: `urn:uuid:${event.id}`,
            type: mapping.type,
            actor: {
                id: event.userId ? `${baseIri}/users/${event.userId}` : `${baseIri}/anonymous`,
                type: 'Person',
            },
            action: mapping.action,
            object: {
                id: `${baseIri}/${event.objectType}/${event.objectId}`,
                type: mapObjectType(event.objectType),
                name: event.objectName,
                extensions: event.result,
            },
            eventTime: event.timestamp,
            edApp: {
                id: baseIri,
                type: 'SoftwareApplication',
            },
            group: event.context?.courseId ? {
                id: `${baseIri}/courses/${event.context.courseId}`,
                type: 'CourseOffering',
                name: event.context?.courseName,
            } : undefined,
            extensions: {
                tenantId: event.tenantId,
                ...event.metadata,
            },
        };
    }
    async getEvents(tenantId, filters) {
        const where = { tenantId };
        if (filters.userId)
            where.userId = filters.userId;
        if (filters.eventType)
            where.eventType = filters.eventType;
        if (filters.from || filters.to) {
            where.createdAt = {};
            if (filters.from)
                where.createdAt.gte = new Date(filters.from);
            if (filters.to)
                where.createdAt.lte = new Date(filters.to);
        }
        const [events, total] = await this.prisma.$transaction([
            this.prisma.learningEvent.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: filters.limit ?? 50,
                skip: filters.offset ?? 0,
                include: { User: { select: { id: true, email: true, name: true } } },
            }),
            this.prisma.learningEvent.count({ where }),
        ]);
        return { events, total, limit: filters.limit ?? 50, offset: filters.offset ?? 0 };
    }
    async getEventAnalytics(tenantId, days = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const [byType, byDay, totalUsers, totalEvents] = await this.prisma.$transaction([
            this.prisma.learningEvent.groupBy({
                by: ['eventType'],
                where: { tenantId, createdAt: { gte: since } },
                _count: { _all: true },
                orderBy: { _count: { eventType: 'desc' } },
            }),
            this.prisma.learningEvent.groupBy({
                by: ['createdAt'],
                where: { tenantId, createdAt: { gte: since } },
                _count: { _all: true },
                orderBy: { createdAt: 'asc' },
            }),
            this.prisma.learningEvent.findMany({
                where: { tenantId, createdAt: { gte: since }, userId: { not: null } },
                distinct: ['userId'],
                select: { userId: true },
            }),
            this.prisma.learningEvent.count({
                where: { tenantId, createdAt: { gte: since } },
            }),
        ]);
        return {
            period: { from: since.toISOString(), to: new Date().toISOString(), days },
            totalEvents,
            uniqueUsers: totalUsers.length,
            byType: byType.map((g) => ({ type: g.eventType, count: g._count._all })),
            dailyTrend: byDay.map((g) => ({
                date: g.createdAt,
                count: g._count._all,
            })),
        };
    }
    async exportXApiStatements(tenantId, from, to, limit = 100) {
        const where = { tenantId };
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = new Date(from);
            if (to)
                where.createdAt.lte = new Date(to);
        }
        const events = await this.prisma.learningEvent.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            take: limit,
            include: { User: { select: { email: true } } },
        });
        return events.map((e) => {
            const payload = e.payload ?? {};
            const streamEvent = {
                id: e.id,
                tenantId: e.tenantId,
                userId: e.userId ?? undefined,
                eventType: e.eventType,
                verb: payload.verb ?? EVENT_TYPE_TO_VERB[e.eventType] ?? 'completed',
                objectType: payload.objectType ?? 'unknown',
                objectId: payload.objectId ?? e.id,
                objectName: payload.objectName,
                result: payload.result,
                context: payload.context,
                timestamp: e.createdAt.toISOString(),
                metadata: payload.metadata,
            };
            return this.toXApiStatement(streamEvent, e.User?.email);
        });
    }
    async exportCaliperEvents(tenantId, from, to, limit = 100) {
        const where = { tenantId };
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = new Date(from);
            if (to)
                where.createdAt.lte = new Date(to);
        }
        const events = await this.prisma.learningEvent.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
        return events.map((e) => {
            const payload = e.payload ?? {};
            const streamEvent = {
                id: e.id,
                tenantId: e.tenantId,
                userId: e.userId ?? undefined,
                eventType: e.eventType,
                verb: payload.verb ?? EVENT_TYPE_TO_VERB[e.eventType] ?? 'completed',
                objectType: payload.objectType ?? 'unknown',
                objectId: payload.objectId ?? e.id,
                objectName: payload.objectName,
                result: payload.result,
                context: payload.context,
                timestamp: e.createdAt.toISOString(),
                metadata: payload.metadata,
            };
            return this.toCaliperEvent(streamEvent);
        });
    }
    async forwardToLrs(tenantId, lrsUrl, authHeader, format, from, to) {
        const statements = format === 'xapi'
            ? await this.exportXApiStatements(tenantId, from, to, 500)
            : await this.exportCaliperEvents(tenantId, from, to, 500);
        if (statements.length === 0)
            return { forwarded: 0 };
        try {
            const response = await fetch(lrsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                    'X-Experience-API-Version': '1.0.3',
                },
                body: JSON.stringify(statements),
            });
            if (!response.ok) {
                this.logger.warn(`LRS forward failed: ${response.status} ${response.statusText}`);
                return { forwarded: 0, error: response.statusText };
            }
            this.logger.log(`Forwarded ${statements.length} ${format} events to LRS for tenant ${tenantId}`);
            return { forwarded: statements.length };
        }
        catch (err) {
            this.logger.error(`LRS forward error: ${err.message}`);
            return { forwarded: 0, error: err.message };
        }
    }
    async getRealtimeCounts(tenantId, date) {
        const dayKey = date ?? new Date().toISOString().slice(0, 10);
        try {
            const counts = await this.redis.hgetall(`events:count:${tenantId}:${dayKey}`);
            return { date: dayKey, counts };
        }
        catch {
            return { date: dayKey, counts: {} };
        }
    }
};
exports.EventStreamService = EventStreamService;
exports.EventStreamService = EventStreamService = EventStreamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(redis_provider_1.REDIS)),
    __param(3, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService, Function, event_emitter_1.EventEmitter2])
], EventStreamService);
function mapObjectType(type) {
    const map = {
        course: 'CourseOffering',
        lesson: 'DigitalResource',
        quiz: 'Assessment',
        assignment: 'AssignableDigitalResource',
        live_session: 'Session',
        video: 'VideoObject',
        page: 'WebPage',
    };
    return map[type] ?? 'DigitalResource';
}
//# sourceMappingURL=event-stream.service.js.map