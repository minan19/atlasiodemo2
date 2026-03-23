import { Injectable, Logger, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { REDIS } from '../../infra/redis/redis.provider';
import { RecommendationType, LearningEventType } from '@prisma/client';

/**
 * AI Recommendation Engine: Analyzes learning events to generate
 * personalized recommendations for students, instructors, and admins.
 *
 * Features:
 * - Student risk scoring (dropout prediction)
 * - Next-step recommendations (adaptive learning path)
 * - Content revision suggestions for instructors
 * - Micro-content injection based on knowledge gaps
 * - Real-time skill profile computation
 */

export interface StudentProfile {
  userId: string;
  tenantId: string;
  totalEvents: number;
  contentViewed: number;
  quizAnswered: number;
  quizCorrect: number;
  liveJoins: number;
  avgQuizScore: number;
  lastActivity: string | null;
  riskScore: number;         // 0-100 (higher = more at risk)
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{
    type: RecommendationType;
    reason: string;
    payload: Record<string, any>;
    score: number;
  }>;
}

export interface ContentInsight {
  courseId: string;
  totalViews: number;
  dropoffRate: number;
  avgQuizScore: number;
  lowPerformanceTopics: string[];
  suggestedRevisions: string[];
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // ─── Student Profile & Risk ────────────────────────────────────────────────

  async computeStudentProfile(userId: string, tenantId: string): Promise<StudentProfile> {
    const events = await this.prisma.learningEvent.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const contentViewed = events.filter((e) => e.eventType === 'CONTENT_VIEWED').length;
    const quizEvents = events.filter((e) => e.eventType === 'QUIZ_ANSWERED');
    const quizCorrect = quizEvents.filter((e) => (e.payload as any)?.correct === true).length;
    const liveJoins = events.filter((e) => e.eventType === 'LIVE_JOIN').length;
    const videoDropoffs = events.filter((e) => e.eventType === 'VIDEO_DROPOFF').length;

    const avgQuizScore = quizEvents.length > 0
      ? Math.round((quizCorrect / quizEvents.length) * 100)
      : 0;

    const lastActivity = events[0]?.createdAt.toISOString() ?? null;

    // Risk scoring
    let riskScore = 50; // base
    if (events.length === 0) riskScore = 90;
    else {
      // Inactivity risk
      if (lastActivity) {
        const daysSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 14) riskScore += 30;
        else if (daysSinceActivity > 7) riskScore += 15;
        else if (daysSinceActivity < 2) riskScore -= 20;
      }
      // Performance risk
      if (avgQuizScore < 40) riskScore += 20;
      else if (avgQuizScore > 80) riskScore -= 20;
      // Engagement risk
      if (videoDropoffs > contentViewed * 0.5) riskScore += 15;
      if (liveJoins > 3) riskScore -= 10;
    }
    riskScore = Math.max(0, Math.min(100, riskScore));

    // Identify strengths & weaknesses from quiz topics
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const topicScores = new Map<string, { correct: number; total: number }>();
    for (const q of quizEvents) {
      const topic = (q.payload as any)?.topicId ?? 'general';
      const existing = topicScores.get(topic) ?? { correct: 0, total: 0 };
      existing.total++;
      if ((q.payload as any)?.correct) existing.correct++;
      topicScores.set(topic, existing);
    }
    for (const [topic, scores] of topicScores) {
      const rate = scores.total > 0 ? scores.correct / scores.total : 0;
      if (rate >= 0.75) strengths.push(topic);
      else if (rate < 0.5) weaknesses.push(topic);
    }

    // Generate recommendations
    const recommendations = await this.generateStudentRecommendations(
      userId, tenantId, riskScore, avgQuizScore, weaknesses, contentViewed, liveJoins,
    );

    // Cache profile in Redis (5 min)
    const profile: StudentProfile = {
      userId, tenantId, totalEvents: events.length,
      contentViewed, quizAnswered: quizEvents.length, quizCorrect,
      liveJoins, avgQuizScore, lastActivity, riskScore,
      strengths, weaknesses, recommendations,
    };

    try {
      await this.redis.set(`profile:${tenantId}:${userId}`, JSON.stringify(profile), 'EX', 300);
    } catch { /* non-critical */ }

    return profile;
  }

  private async generateStudentRecommendations(
    userId: string, tenantId: string,
    riskScore: number, avgQuizScore: number,
    weaknesses: string[], contentViewed: number, liveJoins: number,
  ) {
    const recs: Array<{ type: RecommendationType; reason: string; payload: Record<string, any>; score: number }> = [];

    // Risk alert
    if (riskScore > 70) {
      recs.push({
        type: 'RISK_ALERT',
        reason: 'Öğrenci yüksek risk grubunda — düşük aktivite ve/veya performans',
        payload: { riskScore, urgency: 'high' },
        score: riskScore,
      });
    }

    // Weak topic remediation
    for (const topic of weaknesses.slice(0, 3)) {
      recs.push({
        type: 'MICRO_CONTENT',
        reason: `"${topic}" konusunda ek çalışma önerilir (düşük başarı oranı)`,
        payload: { topicId: topic, type: 'remediation' },
        score: 75,
      });
    }

    // Next step
    if (avgQuizScore > 70 && contentViewed > 5) {
      recs.push({
        type: 'STUDENT_NEXT_STEP',
        reason: 'İyi performans — bir sonraki modüle geçiş önerilir',
        payload: { action: 'advance_module' },
        score: 80,
      });
    }

    // Live engagement
    if (liveJoins === 0) {
      recs.push({
        type: 'STUDENT_NEXT_STEP',
        reason: 'Henüz canlı derse katılmadı — etkileşim artırılmalı',
        payload: { action: 'join_live_session' },
        score: 60,
      });
    }

    // Persist top recommendations
    for (const rec of recs.slice(0, 5)) {
      await this.prisma.recommendation.create({
        data: {
          tenantId,
          userId,
          type: rec.type,
          payload: rec.payload,
          reason: rec.reason,
          score: rec.score,
          explainedBy: 'rule-engine-v1',
          modelVersion: 'heuristic-1.0',
        },
      }).catch(() => null);
    }

    return recs;
  }

  // ─── Instructor Content Insights ───────────────────────────────────────────

  async getContentInsights(tenantId: string, courseId?: string): Promise<ContentInsight[]> {
    const courses = courseId
      ? await this.prisma.course.findMany({ where: { id: courseId, tenantId }, select: { id: true } })
      : await this.prisma.course.findMany({ where: { tenantId }, select: { id: true } });

    const insights: ContentInsight[] = [];

    for (const course of courses) {
      const events = await this.prisma.learningEvent.findMany({
        where: {
          tenantId,
          payload: { path: ['objectId'], equals: course.id },
        },
      });

      const views = events.filter((e) => e.eventType === 'CONTENT_VIEWED').length;
      const dropoffs = events.filter((e) => e.eventType === 'VIDEO_DROPOFF').length;
      const quizzes = events.filter((e) => e.eventType === 'QUIZ_ANSWERED');
      const correct = quizzes.filter((e) => (e.payload as any)?.correct).length;
      const avgScore = quizzes.length > 0 ? Math.round((correct / quizzes.length) * 100) : 0;

      const lowTopics: string[] = [];
      const revisions: string[] = [];

      if (dropoffs > views * 0.3) revisions.push('Video içerik uzunluğu kısaltılmalı');
      if (avgScore < 50) revisions.push('Quiz zorluk seviyesi gözden geçirilmeli');
      if (views === 0) revisions.push('İçerik tanıtımı yapılmalı — görünürlük düşük');

      insights.push({
        courseId: course.id,
        totalViews: views,
        dropoffRate: views > 0 ? Math.round((dropoffs / views) * 100) : 0,
        avgQuizScore: avgScore,
        lowPerformanceTopics: lowTopics,
        suggestedRevisions: revisions,
      });
    }

    return insights;
  }

  // ─── Admin Dashboard: At-Risk Students ─────────────────────────────────────

  async getAtRiskStudents(tenantId: string, threshold = 70, limit = 20) {
    // Get recent students
    const students = await this.prisma.user.findMany({
      where: { tenantId, role: 'STUDENT', isActive: true },
      select: { id: true, email: true, name: true },
      take: 100,
    });

    const atRisk: Array<{ userId: string; email: string; name: string | null; riskScore: number }> = [];

    for (const student of students) {
      // Check Redis cache first
      try {
        const cached = await this.redis.get(`profile:${tenantId}:${student.id}`);
        if (cached) {
          const profile = JSON.parse(cached);
          if (profile.riskScore >= threshold) {
            atRisk.push({ userId: student.id, email: student.email, name: student.name, riskScore: profile.riskScore });
          }
          continue;
        }
      } catch { /* proceed */ }

      // Quick risk computation (lightweight)
      const eventCount = await this.prisma.learningEvent.count({
        where: { userId: student.id, tenantId },
      });
      const lastEvent = await this.prisma.learningEvent.findFirst({
        where: { userId: student.id, tenantId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      let risk = 50;
      if (eventCount === 0) risk = 90;
      else if (lastEvent) {
        const days = (Date.now() - lastEvent.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (days > 14) risk += 30;
        else if (days > 7) risk += 15;
      }

      if (risk >= threshold) {
        atRisk.push({ userId: student.id, email: student.email, name: student.name, riskScore: risk });
      }
    }

    return atRisk
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  }

  // ─── Get Recommendations for User ──────────────────────────────────────────

  async getUserRecommendations(userId: string, tenantId: string, limit = 10) {
    return this.prisma.recommendation.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
