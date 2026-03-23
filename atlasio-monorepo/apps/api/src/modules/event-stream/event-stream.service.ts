import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { REDIS } from '../../infra/redis/redis.provider';
import { LearningEventType } from '@prisma/client';

// ─── xAPI Statement Types ────────────────────────────────────────────────────

export interface XApiActor {
  objectType: 'Agent';
  name?: string;
  mbox?: string;           // mailto:user@example.com
  account?: { homePage: string; name: string };
}

export interface XApiVerb {
  id: string;              // e.g., http://adlnet.gov/expapi/verbs/completed
  display: Record<string, string>; // { "en-US": "completed" }
}

export interface XApiObject {
  objectType: 'Activity';
  id: string;              // IRI for the activity
  definition?: {
    type?: string;
    name?: Record<string, string>;
    description?: Record<string, string>;
    extensions?: Record<string, any>;
  };
}

export interface XApiStatement {
  id: string;
  actor: XApiActor;
  verb: XApiVerb;
  object: XApiObject;
  result?: {
    score?: { raw?: number; min?: number; max?: number; scaled?: number };
    success?: boolean;
    completion?: boolean;
    duration?: string;      // ISO 8601 duration
    extensions?: Record<string, any>;
  };
  context?: {
    registration?: string;
    contextActivities?: {
      parent?: XApiObject[];
      grouping?: XApiObject[];
    };
    extensions?: Record<string, any>;
  };
  timestamp: string;
  stored?: string;
  authority?: XApiActor;
}

// ─── Caliper Event Types ─────────────────────────────────────────────────────

export interface CaliperEvent {
  '@context': string;
  id: string;
  type: string;            // e.g., NavigationEvent, AssessmentItemEvent
  actor: {
    id: string;
    type: string;
    name?: string;
  };
  action: string;           // e.g., NavigatedTo, Completed, Submitted
  object: {
    id: string;
    type: string;
    name?: string;
    extensions?: Record<string, any>;
  };
  eventTime: string;
  edApp?: { id: string; type: string };
  group?: { id: string; type: string; name?: string };
  membership?: { id: string; type: string; roles?: string[] };
  session?: { id: string; type: string };
  extensions?: Record<string, any>;
}

// ─── Internal Event ──────────────────────────────────────────────────────────

export interface LearningStreamEvent {
  id: string;
  tenantId: string;
  userId?: string;
  eventType: LearningEventType;
  verb: string;              // Human-readable verb (viewed, completed, answered, etc.)
  objectType: string;        // course, lesson, quiz, assignment, live_session
  objectId: string;
  objectName?: string;
  result?: Record<string, any>;
  context?: Record<string, any>;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ─── xAPI Verb Mapping ──────────────────────────────────────────────────────

const XAPI_VERBS: Record<string, XApiVerb> = {
  viewed: { id: 'http://id.tincanapi.com/verb/viewed', display: { 'en-US': 'viewed' } },
  completed: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } },
  answered: { id: 'http://adlnet.gov/expapi/verbs/answered', display: { 'en-US': 'answered' } },
  submitted: { id: 'http://adlnet.gov/expapi/verbs/attempted', display: { 'en-US': 'submitted' } },
  joined: { id: 'http://activitystrea.ms/schema/1.0/join', display: { 'en-US': 'joined' } },
  chatted: { id: 'http://id.tincanapi.com/verb/replied', display: { 'en-US': 'chatted' } },
  graded: { id: 'http://id.tincanapi.com/verb/graded', display: { 'en-US': 'graded' } },
  dropped_off: { id: 'http://id.tincanapi.com/verb/abandoned', display: { 'en-US': 'abandoned' } },
};

const EVENT_TYPE_TO_VERB: Record<LearningEventType, string> = {
  CONTENT_VIEWED: 'viewed',
  VIDEO_DROPOFF: 'dropped_off',
  QUIZ_ANSWERED: 'answered',
  ASSIGNMENT_SUBMITTED: 'submitted',
  LIVE_JOIN: 'joined',
  LIVE_CHAT: 'chatted',
  GRADE_POSTED: 'graded',
  CALIPER_EVENT: 'completed',
};

// ─── Caliper Action Mapping ─────────────────────────────────────────────────

const CALIPER_ACTIONS: Record<string, { type: string; action: string }> = {
  viewed: { type: 'NavigationEvent', action: 'NavigatedTo' },
  completed: { type: 'AssessmentEvent', action: 'Completed' },
  answered: { type: 'AssessmentItemEvent', action: 'Completed' },
  submitted: { type: 'AssignableEvent', action: 'Submitted' },
  joined: { type: 'SessionEvent', action: 'LoggedIn' },
  chatted: { type: 'MessageEvent', action: 'Posted' },
  graded: { type: 'GradeEvent', action: 'Graded' },
  dropped_off: { type: 'MediaEvent', action: 'Paused' },
};

@Injectable()
export class EventStreamService {
  private readonly logger = new Logger(EventStreamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(REDIS) private readonly redis: Redis,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  // ─── Core: Emit Learning Event ─────────────────────────────────────────────

  /**
   * Central event emission point. Records to DB, publishes to Redis stream,
   * and optionally emits to in-process EventEmitter for real-time consumers.
   */
  async emit(params: {
    tenantId: string;
    userId?: string;
    eventType: LearningEventType;
    objectType: string;
    objectId: string;
    objectName?: string;
    result?: Record<string, any>;
    context?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<LearningStreamEvent> {
    const verb = EVENT_TYPE_TO_VERB[params.eventType] ?? 'completed';
    const event: LearningStreamEvent = {
      id: randomUUID(),
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

    // 1. Persist to LearningEvent table
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

    // 2. Publish to Redis stream for async consumers
    try {
      await this.redis.xadd(
        `events:${event.tenantId}`,
        '*',
        'id', event.id,
        'type', event.eventType,
        'verb', event.verb,
        'userId', event.userId ?? '',
        'objectType', event.objectType,
        'objectId', event.objectId,
        'data', JSON.stringify(event),
      );
    } catch (err) {
      this.logger.warn(`Redis stream publish failed: ${(err as Error).message}`);
    }

    // 3. In-process event emission (Zero-latency AI Trigger)
    if (this.eventEmitter) {
      this.eventEmitter.emit('learning.event', event);
      this.eventEmitter.emit(`learning.${event.verb}`, event);
      
      // Bilişsel Yapay Zeka (Cognitive AI) motoru için spesifik event tetiklemeleri
      if (event.eventType === 'QUIZ_ANSWERED') {
          this.eventEmitter.emit('ai.quiz.analyzed', event);
      }
      if (event.eventType === 'VIDEO_DROPOFF' || event.eventType === 'CONTENT_VIEWED') {
          this.eventEmitter.emit('ai.student.risk.evaluated', event);
      }
    }

    // 4. Increment real-time counter in Redis
    try {
      const dayKey = new Date().toISOString().slice(0, 10);
      await this.redis.hincrby(`events:count:${event.tenantId}:${dayKey}`, event.eventType, 1);
      await this.redis.expire(`events:count:${event.tenantId}:${dayKey}`, 90 * 24 * 60 * 60); // 90 days
    } catch {
      // non-critical
    }

    return event;
  }

  // ─── xAPI Format ───────────────────────────────────────────────────────────

  /**
   * Convert internal event to xAPI Statement.
   */
  toXApiStatement(event: LearningStreamEvent, actorEmail?: string): XApiStatement {
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

  // ─── Caliper Format ────────────────────────────────────────────────────────

  /**
   * Convert internal event to IMS Caliper Event.
   */
  toCaliperEvent(event: LearningStreamEvent): CaliperEvent {
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

  // ─── Query & Analytics ─────────────────────────────────────────────────────

  async getEvents(tenantId: string, filters: {
    userId?: string;
    eventType?: LearningEventType;
    objectType?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { tenantId };
    if (filters.userId) where.userId = filters.userId;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
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

  /**
   * Get aggregated event counts per type for dashboard.
   */
  async getEventAnalytics(tenantId: string, days = 30) {
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
      byType: byType.map((g: any) => ({ type: g.eventType, count: g._count._all })),
      dailyTrend: byDay.map((g: any) => ({
        date: g.createdAt,
        count: g._count._all,
      })),
    };
  }

  // ─── Export xAPI Statements (for LRS) ──────────────────────────────────────

  async exportXApiStatements(tenantId: string, from?: string, to?: string, limit = 100) {
    const where: any = { tenantId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const events = await this.prisma.learningEvent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { User: { select: { email: true } } },
    });

    return events.map((e) => {
      const payload = e.payload as any ?? {};
      const streamEvent: LearningStreamEvent = {
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
      return this.toXApiStatement(streamEvent, (e as any).User?.email);
    });
  }

  /**
   * Export as Caliper events for LRS integration.
   */
  async exportCaliperEvents(tenantId: string, from?: string, to?: string, limit = 100) {
    const where: any = { tenantId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const events = await this.prisma.learningEvent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return events.map((e) => {
      const payload = e.payload as any ?? {};
      const streamEvent: LearningStreamEvent = {
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

  // ─── Webhook Delivery ──────────────────────────────────────────────────────

  /**
   * Forward events to external LRS or webhook endpoint.
   */
  async forwardToLrs(tenantId: string, lrsUrl: string, authHeader: string, format: 'xapi' | 'caliper', from?: string, to?: string) {
    const statements = format === 'xapi'
      ? await this.exportXApiStatements(tenantId, from, to, 500)
      : await this.exportCaliperEvents(tenantId, from, to, 500);

    if (statements.length === 0) return { forwarded: 0 };

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
    } catch (err) {
      this.logger.error(`LRS forward error: ${(err as Error).message}`);
      return { forwarded: 0, error: (err as Error).message };
    }
  }

  // ─── Real-time Event Counts ────────────────────────────────────────────────

  async getRealtimeCounts(tenantId: string, date?: string) {
    const dayKey = date ?? new Date().toISOString().slice(0, 10);
    try {
      const counts = await this.redis.hgetall(`events:count:${tenantId}:${dayKey}`);
      return { date: dayKey, counts };
    } catch {
      return { date: dayKey, counts: {} };
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapObjectType(type: string): string {
  const map: Record<string, string> = {
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
