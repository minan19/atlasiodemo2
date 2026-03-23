import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProctorEventDto, ProctorEventType, StartProctorSessionDto } from './dto';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';
import { ProctoringNoSqlWriter } from './proctoring.nosql';

type TrustScoreState = {
  eye?: number;
  head?: number;
  audio?: number;
  tab?: number;
  object?: number;
};

@Injectable()
export class ProctoringService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
    private readonly nosql: ProctoringNoSqlWriter = new ProctoringNoSqlWriter(),
  ) {}

  async startSession(userId: string, dto: StartProctorSessionDto) {
    const session = await this.prisma.examSession.create({
      data: {
        userId,
        courseId: dto.courseId,
        deviceInfo: { startedAt: new Date().toISOString(), requestId: randomUUID() } as Prisma.InputJsonValue,
      },
    });
    // Redis state init
    await this.redis.hset(this.redisKey(session.id), {
      eye: 1,
      head: 1,
      audio: 1,
      tab: 1,
      object: 1,
    });
    await this.redis.expire(this.redisKey(session.id), 60 * 60); // 1 saat TTL
    return { sessionId: session.id };
  }

  private redisKey(sessionId: string) {
    return `proctor:session:${sessionId}`;
  }

  private computeTrustScore(state: TrustScoreState) {
    // Basit ağırlıklandırma: göz 0.3, baş 0.2, ses 0.2, tab 0.2, obje 0.1
    const weights = { eye: 0.3, head: 0.2, audio: 0.2, tab: 0.2, object: 0.1 };
    let score = 1;
    if (state.eye !== undefined) score *= 1 - (1 - (state.eye ?? 1)) * weights.eye;
    if (state.head !== undefined) score *= 1 - (1 - (state.head ?? 1)) * weights.head;
    if (state.audio !== undefined) score *= 1 - (1 - (state.audio ?? 1)) * weights.audio;
    if (state.tab !== undefined) score *= 1 - (1 - (state.tab ?? 1)) * weights.tab;
    if (state.object !== undefined) score *= 1 - (1 - (state.object ?? 1)) * weights.object;
    return Math.max(0, Math.min(1, score));
  }

  async ingestEvent(userId: string, dto: ProctorEventDto) {
    const session = await this.prisma.examSession.findUnique({ where: { id: dto.sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    const redisKey = this.redisKey(dto.sessionId);

    // High-frequency log to NoSQL (async, fire-and-forget)
    void this.nosql.writeLog({
      sessionId: dto.sessionId,
      ts: new Date().toISOString(),
      eventType: dto.type,
      confidence: dto.score,
      value: dto.value,
      flags: dto.flags,
    });

    // Persist low-frequency aggregates (hi-freq raw -> NoSQL/Redis; stub here)
    await this.prisma.aiProctoringResult.create({
      data: {
        sessionId: dto.sessionId,
        eyeScore: dto.type === ProctorEventType.EYE ? dto.score : undefined,
        headScore: dto.type === ProctorEventType.HEAD ? dto.score : undefined,
        audioScore: dto.type === ProctorEventType.AUDIO ? dto.score : undefined,
        tabSwitches: dto.type === ProctorEventType.TAB ? Math.round(dto.value ?? 0) : undefined,
        objectFlags: dto.type === ProctorEventType.OBJECT ? Math.round((dto.value ?? 0)) : undefined,
        finalTrustScore: undefined,
        aiRecommendation: undefined,
      },
    });

    // Simple live trustScore (should be cached in Redis; here calculated on last N rows)
    const last = await this.prisma.aiProctoringResult.findMany({
      where: { sessionId: dto.sessionId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const state: TrustScoreState = {};
    for (const row of last) {
      if (row.eyeScore !== null && row.eyeScore !== undefined) state.eye = row.eyeScore;
      if (row.headScore !== null && row.headScore !== undefined) state.head = row.headScore;
      if (row.audioScore !== null && row.audioScore !== undefined) state.audio = row.audioScore;
      if (row.tabSwitches !== null && row.tabSwitches !== undefined) {
        // daha fazla tab switch → düşük skor
        state.tab = Math.max(0, 1 - Math.min(1, row.tabSwitches / 5));
      }
      if (row.objectFlags !== null && row.objectFlags !== undefined) {
        state.object = row.objectFlags > 0 ? 0.2 : 1;
      }
    }
    const trust = this.computeTrustScore(state);
    await this.prisma.examSession.update({
      where: { id: dto.sessionId },
      data: { trustScore: trust },
    });
    // Cache live trustScore
    await this.redis.hset(this.redisKey(dto.sessionId), { trust });
    // Rolling aggregation: keep last timestamp for alarm checks (simple)
    await this.redis.hset(redisKey, { lastEvent: Date.now() });
    // Alarm eşiği örnek: trust < 0.5 → alert flag
    if (trust < 0.5) {
      await this.redis.hset(redisKey, { alert: 1 });
      
      // AI Gözetmen Uyarısı (Proctoring Alert)
      await this.prisma.examSession.update({
         where: { id: dto.sessionId },
         data: {
             aiDecision: 'SUSPICIOUS',
             proctorNote: 'Yapay Zeka gözetmeni olağandışı aktivite (kopya şüphesi) tespit etti.'
         }
      });
    }

    return { trustScore: trust };
  }

  async getScore(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    const cached = await this.redis.hget(this.redisKey(sessionId), 'trust');
    const latest = await this.prisma.aiProctoringResult.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
    return { trustScore: (cached ? Number(cached) : session.trustScore) ?? null, latest };
  }
}
