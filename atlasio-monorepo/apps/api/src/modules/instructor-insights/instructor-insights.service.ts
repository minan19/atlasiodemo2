import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type Redis from 'ioredis';
import { REDIS } from '../../infra/redis/redis.provider';
import { classInsightsKey, studentInsightsKey } from './utils/cache-keys';
import { decodeCursor, encodeCursor } from './utils/cursor.utils';

type Window = '7d' | '30d' | '90d';

type MasteryAnswer = {
  isCorrect: boolean;
  timeSpentMs?: number | null;
  createdAt: Date;
  attempt: { userId: string };
  question: {
    id: string;
    difficulty: number;
    tags: Array<{ topicId: string; weight: number; topic: { id: string; name: string } }>;
  };
};

type RawAttempt = {
  userId: string | null;
  correct: boolean;
  durationMs: number | null;
  createdAt: Date;
  Question: { id: string; difficulty: number; Topic: { id: string; name: string } | null } | null;
};

function adaptAttempts(rawAttempts: RawAttempt[]): MasteryAnswer[] {
  return rawAttempts
    .filter((a) => a.userId && a.Question?.Topic)
    .map((a) => ({
      isCorrect: a.correct,
      timeSpentMs: a.durationMs,
      createdAt: a.createdAt,
      attempt: { userId: a.userId! },
      question: {
        id: a.Question!.id,
        difficulty: a.Question!.difficulty,
        tags: [
          {
            topicId: a.Question!.Topic!.id,
            weight: 1,
            topic: { id: a.Question!.Topic!.id, name: a.Question!.Topic!.name },
          },
        ],
      },
    }));
}

type Requester = {
  id: string;
  role?: string;
  tenantId?: string;
};

const DEFAULT_THRESHOLDS = { critical: 40, good: 70 };

function getThresholds() {
  const env = process.env.INSIGHT_THRESHOLDS; // "40,70"
  if (!env) return DEFAULT_THRESHOLDS;
  const [cStr, gStr] = env.split(',');
  const critical = Number(cStr);
  const good = Number(gStr);
  if (Number.isFinite(critical) && Number.isFinite(good) && critical < good) {
    return { critical, good };
  }
  return DEFAULT_THRESHOLDS;
}

function windowToDate(window: Window): Date {
  const now = new Date();
  const days = window === '7d' ? 7 : window === '30d' ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function recencyWeight(answerDate: Date, windowStart: Date): number {
  const t = answerDate.getTime();
  const s = windowStart.getTime();
  const n = Date.now();
  if (t <= s) return 0.2;
  const ratio = (t - s) / (n - s); // 0..1
  return 0.3 + 0.7 * ratio; // 0.3..1.0
}

function difficultyWeight(difficulty: number): number {
  const d = Math.max(1, Math.min(5, difficulty || 3));
  return 0.75 + d * 0.1; // 0.85..1.25
}

function timePenalty(timeSpentMs?: number | null): number {
  if (!timeSpentMs) return 0;
  if (timeSpentMs > 90_000) return 0.15;
  if (timeSpentMs > 60_000) return 0.08;
  return 0;
}

function normalize0_100(raw: number): number {
  const clamped = Math.max(-15, Math.min(15, raw));
  const score = (clamped + 15) / 30; // 0..1
  return Math.round(score * 1000) / 10; // 0.1 precision
}

@Injectable()
export class InstructorInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private async assertInstructorAccessToClass(classId: string, requester: Requester) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { instructorId: true, tenantId: true },
    });
    if (!cls) throw new NotFoundException('Class not found');
    if ((requester.role || '').toUpperCase() === 'ADMIN') {
      if (requester.tenantId && requester.tenantId !== cls.tenantId) {
        throw new ForbiddenException('Not allowed for this tenant');
      }
      return;
    }
    if (requester.tenantId && requester.tenantId !== cls.tenantId) {
      throw new ForbiddenException('Not allowed for this tenant');
    }
    if (cls.instructorId !== requester.id) {
      throw new ForbiddenException('Not allowed for this class');
    }
  }

  async getClassInsights(args: { classId: string; window: Window; requester: Requester }) {
    const { classId, window, requester } = args;
    await this.assertInstructorAccessToClass(classId, requester);

    const cacheKey = classInsightsKey(classId, window);
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const windowStart = windowToDate(window);
    const windowEnd = new Date();
    const thresholds = getThresholds();

    const cls = await this.prisma.class.findUnique({ where: { id: classId }, select: { courseId: true } });
    const enrollments = cls?.courseId
      ? await this.prisma.enrollment.findMany({
          where: { courseId: cls.courseId },
          select: { userId: true, User: { select: { email: true } } },
        })
      : [];
    const members = enrollments.map((e) => ({ userId: e.userId, user: { email: e.User.email } }));
    const studentIds = members.map((m) => m.userId);

    const rawAttempts = await this.prisma.quizAttempt.findMany({
      where: {
        createdAt: { gte: windowStart, lte: windowEnd },
        userId: { in: studentIds },
      },
      select: {
        userId: true,
        correct: true,
        durationMs: true,
        createdAt: true,
        Question: {
          select: {
            id: true,
            difficulty: true,
            Topic: { select: { id: true, name: true } },
          },
        },
      },
      take: 50_000,
    });
    const answers = adaptAttempts(rawAttempts as RawAttempt[]);

    const { perStudentTopic, topicMeta, evidence } = this.computeMastery(answers, windowStart);

    const topicAverages: Array<{ topicId: string; name: string; avgScore: number; criticalCount: number }> = [];
    for (const [topicId, meta] of topicMeta.entries()) {
      let sum = 0;
      let cnt = 0;
      let criticalCount = 0;
      for (const sid of studentIds) {
        const sScore = perStudentTopic.get(sid)?.get(topicId);
        if (sScore == null) continue;
        sum += sScore;
        cnt += 1;
        if (sScore < thresholds.critical) criticalCount += 1;
      }
      if (cnt === 0) continue;
      topicAverages.push({
        topicId,
        name: meta.name,
        avgScore: Math.round((sum / cnt) * 10) / 10,
        criticalCount,
      });
    }
    topicAverages.sort((a, b) => a.avgScore - b.avgScore);
    const topWeakTopics = topicAverages.slice(0, 5);

    const heatmapStudents = members.map((m) => {
      const scoresObj: Record<string, number> = {};
      const map = perStudentTopic.get(m.userId);
      if (map) for (const t of topWeakTopics) scoresObj[t.topicId] = map.get(t.topicId) ?? 0;
      return { userId: m.userId, name: m.user.email, scores: scoresObj };
    });

    const recommendations = topWeakTopics.map((t) => ({
      scope: 'class' as const,
      topicId: t.topicId,
      topicName: t.name,
      why: `Sınıf ortalaması düşük (avg=${t.avgScore}) ve kritik öğrenci sayısı=${t.criticalCount}`,
      actions: [
        { type: 'miniReview' as const, durationMin: 15 },
        { type: 'miniQuiz' as const, questionCount: 10, difficultyMix: [1, 2, 3] },
      ],
      evidence: evidence.classTopicEvidence.get(t.topicId) ?? null,
    }));

    const allScores: number[] = [];
    for (const sid of studentIds) {
      const map = perStudentTopic.get(sid);
      if (!map) continue;
      for (const v of map.values()) allScores.push(v);
    }
    const avgMastery = allScores.length
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : 0;

    const criticalStudents = members.filter((m) => {
      const map = perStudentTopic.get(m.userId);
      if (!map) return false;
      for (const v of map.values()) if (v < thresholds.critical) return true;
      return false;
    }).length;

    const response = {
      classId,
      window,
      summary: {
        avgMastery,
        criticalStudents,
        topWeakTopics: topWeakTopics.map((t) => ({ topicId: t.topicId, name: t.name, avgScore: t.avgScore })),
      },
      heatmap: {
        topics: topWeakTopics.map((t) => ({ topicId: t.topicId, name: t.name })),
        students: heatmapStudents,
      },
      recommendations,
    };

    await this.redis.set(cacheKey, JSON.stringify(response), 'EX', 600);
    return response;
  }

  async getStudentInsights(args: {
    classId: string;
    studentId: string;
    window: Window;
    requester: Requester;
  }) {
    const { classId, studentId, window, requester } = args;
    await this.assertInstructorAccessToClass(classId, requester);

    const cacheKey = studentInsightsKey(classId, studentId, window);
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const clsForStudent = await this.prisma.class.findUnique({ where: { id: classId }, select: { courseId: true } });
    const enrollment = clsForStudent?.courseId
      ? await this.prisma.enrollment.findFirst({ where: { courseId: clsForStudent.courseId, userId: studentId } })
      : null;
    if (!enrollment) throw new NotFoundException('Student not in class');

    const windowStart = windowToDate(window);
    const windowEnd = new Date();

    const rawStudentAttempts = await this.prisma.quizAttempt.findMany({
      where: {
        createdAt: { gte: windowStart, lte: windowEnd },
        userId: studentId,
      },
      select: {
        userId: true,
        correct: true,
        durationMs: true,
        createdAt: true,
        Question: {
          select: {
            id: true,
            difficulty: true,
            Topic: { select: { id: true, name: true } },
          },
        },
      },
      take: 20_000,
    });
    const answers = adaptAttempts(rawStudentAttempts as RawAttempt[]);

    const { perStudentTopic, topicMeta, evidence } = this.computeMastery(answers, windowStart);

    const map = perStudentTopic.get(studentId) ?? new Map<string, number>();
    const list = Array.from(map.entries()).map(([topicId, score]) => ({
      topicId,
      name: topicMeta.get(topicId)?.name ?? topicId,
      score,
      evidence: evidence.studentTopicEvidence.get(`${studentId}:${topicId}`) ?? null,
    }));
    list.sort((a, b) => a.score - b.score);

    const topWeakTopics = list.slice(0, 3).map((t) => ({
      ...t,
      recommendedActions: [
        { type: 'practiceSet' as const, questionCount: 20, difficultyMix: [1, 2] },
        { type: 'targetedQuiz' as const, questionCount: 8, difficultyMix: [2, 3] },
      ],
    }));

    const response = {
      studentId,
      classId,
      window,
      topWeakTopics,
    };
    await this.redis.set(cacheKey, JSON.stringify(response), 'EX', 600);
    return response;
  }

  private computeMastery(
    answers: Array<{
      isCorrect: boolean;
      timeSpentMs?: number | null;
      createdAt: Date;
      attempt: { userId: string };
      question: {
        id: string;
        difficulty: number;
        tags: Array<{ topicId: string; weight: number; topic: { id: string; name: string } }>;
      };
    }>,
    windowStart: Date,
  ) {
    const raw: Map<string, Map<string, number>> = new Map();
    const topicMeta: Map<string, { name: string }> = new Map();
    const thresholds = getThresholds();

    const wrongByStudentTopic: Map<string, string[]> = new Map();
    const wrongByClassTopic: Map<string, string[]> = new Map();

    for (const a of answers) {
      const userId = a.attempt.userId;
      const sign = a.isCorrect ? 1 : -1;
      const rW = recencyWeight(a.createdAt, windowStart);
      const dW = difficultyWeight(a.question.difficulty);
      const tP = timePenalty(a.timeSpentMs);

      if (!a.question.tags || a.question.tags.length === 0) continue; // tag yoksa atla

      // weight normalizasyonu
      const weightSum = a.question.tags.reduce((s, t) => s + (t.weight || 0), 0) || 0;
      const norm = weightSum > 0 ? weightSum : 1;

      for (const tag of a.question.tags) {
        const topicId = tag.topicId;
        if (!topicId) continue;
        topicMeta.set(topicId, { name: tag.topic.name });

        const w = (tag.weight || 0) / norm || 0;
        if (w === 0) continue;
        const delta = sign * rW * dW * w - tP;

        if (!raw.has(userId)) raw.set(userId, new Map());
        const m = raw.get(userId)!;
        m.set(topicId, (m.get(topicId) ?? 0) + delta);

        if (!a.isCorrect) {
          const key = `${userId}:${topicId}`;
          const arr = wrongByStudentTopic.get(key) ?? [];
          if (arr.length < 10) arr.push(a.question.id);
          wrongByStudentTopic.set(key, arr);

          const arr2 = wrongByClassTopic.get(topicId) ?? [];
          if (arr2.length < 10) arr2.push(a.question.id);
          wrongByClassTopic.set(topicId, arr2);
        }
      }
    }

    const perStudentTopic: Map<string, Map<string, number>> = new Map();
    for (const [userId, topics] of raw.entries()) {
      const out = new Map<string, number>();
      for (const [topicId, rawScore] of topics.entries()) {
        out.set(topicId, normalize0_100(rawScore));
      }
      perStudentTopic.set(userId, out);
    }

    const studentTopicEvidence: Map<string, any> = new Map();
    for (const [k, qIds] of wrongByStudentTopic.entries()) {
      studentTopicEvidence.set(k, { wrongQuestionIds: qIds.slice(0, 5) });
    }
    const classTopicEvidence: Map<string, any> = new Map();
    for (const [topicId, qIds] of wrongByClassTopic.entries()) {
      classTopicEvidence.set(topicId, { wrongQuestionIds: qIds.slice(0, 5) });
    }

    return {
      perStudentTopic,
      topicMeta,
      evidence: { studentTopicEvidence, classTopicEvidence },
    };
  }

  async createInstructorAction(args: { dto: any; requester: Requester }) {
    const { dto, requester } = args;
    await this.assertInstructorAccessToClass(dto.classId, requester);

    if (dto.targetType === 'student' && !dto.targetUserId) {
      throw new ForbiddenException('targetUserId required for student target');
    }

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;

    const action = await this.prisma.instructorAction.create({
      data: {
        classId: dto.classId,
        createdById: requester.id,
        targetType: dto.targetType,
        targetUserId: dto.targetType === 'student' ? dto.targetUserId : null,
        actionType: dto.actionType,
        payload: dto.payload,
        dueAt,
      },
    });

    return { ok: true, actionId: action.id };
  }

  async listInstructorActions(args: { query: any; requester: Requester }) {
    const { query, requester } = args;

    if (query.classId) {
      await this.assertInstructorAccessToClass(query.classId, requester);
    }

    const limit = query.limit ?? 50;
    const where: any = {};
    if (query.classId) where.classId = query.classId;
    if (query.status) where.status = query.status;
    if (query.targetType) where.targetType = query.targetType;
    if (requester.role !== 'admin') {
      where.createdById = requester.id;
    }

    if (query.cursor) {
      const { createdAtIso, id } = decodeCursor(query.cursor);
      const createdAt = new Date(createdAtIso);
      where.OR = [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: id } },
      ];
    }

    const items = await this.prisma.instructorAction.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore
      ? encodeCursor(page[page.length - 1].createdAt.toISOString(), page[page.length - 1].id)
      : null;

    return { items: page, nextCursor };
  }

  async updateInstructorAction(args: { actionId: string; dto: any; requester: Requester }) {
    const { actionId, dto, requester } = args;

    const action = await this.prisma.instructorAction.findUnique({
      where: { id: actionId },
      select: { id: true, classId: true, createdById: true },
    });
    if (!action) throw new NotFoundException('Action not found');

    await this.assertInstructorAccessToClass(action.classId, requester);

    if (requester.role !== 'admin' && action.createdById !== requester.id) {
      throw new ForbiddenException('Not allowed to update this action');
    }

    const updated = await this.prisma.instructorAction.update({
      where: { id: actionId },
      data: {
        status: dto.status ?? undefined,
        payload: dto.payload ?? undefined,
      },
    });

    return { ok: true, item: updated };
  }

  async listMyActions(args: { userId: string; query: any }) {
    const { userId, query } = args;
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const where: any = {
      targetType: 'student',
      targetUserId: userId,
    };
    if (query.status) where.status = query.status;

    if (query.cursor) {
      const { createdAtIso, id } = decodeCursor(query.cursor);
      const createdAt = new Date(createdAtIso);
      where.OR = [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: id } },
      ];
    }

    const items = await this.prisma.instructorAction.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore
      ? encodeCursor(page[page.length - 1].createdAt.toISOString(), page[page.length - 1].id)
      : null;

    return { items: page, nextCursor };
  }

  async updateMyAction(args: { actionId: string; dto: any; userId: string }) {
    const { actionId, dto, userId } = args;

    const action = await this.prisma.instructorAction.findUnique({
      where: { id: actionId },
      select: { id: true, targetType: true, targetUserId: true, status: true, payload: true },
    });
    if (!action) throw new NotFoundException('Action not found');

    if (action.targetType !== 'student' || action.targetUserId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    const updated = await this.prisma.instructorAction.update({
      where: { id: actionId },
      data: {
        status: dto.status ?? action.status,
      },
    });

    return { ok: true, item: updated };
  }
}
