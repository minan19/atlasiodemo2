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
var RecommendationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const redis_provider_1 = require("../../infra/redis/redis.provider");
let RecommendationService = RecommendationService_1 = class RecommendationService {
    constructor(prisma, audit, redis) {
        this.prisma = prisma;
        this.audit = audit;
        this.redis = redis;
        this.logger = new common_1.Logger(RecommendationService_1.name);
    }
    async computeStudentProfile(userId, tenantId) {
        const events = await this.prisma.learningEvent.findMany({
            where: { userId, tenantId },
            orderBy: { createdAt: 'desc' },
        });
        const contentViewed = events.filter((e) => e.eventType === 'CONTENT_VIEWED').length;
        const quizEvents = events.filter((e) => e.eventType === 'QUIZ_ANSWERED');
        const quizCorrect = quizEvents.filter((e) => e.payload?.correct === true).length;
        const liveJoins = events.filter((e) => e.eventType === 'LIVE_JOIN').length;
        const videoDropoffs = events.filter((e) => e.eventType === 'VIDEO_DROPOFF').length;
        const avgQuizScore = quizEvents.length > 0
            ? Math.round((quizCorrect / quizEvents.length) * 100)
            : 0;
        const lastActivity = events[0]?.createdAt.toISOString() ?? null;
        let riskScore = 50;
        if (events.length === 0)
            riskScore = 90;
        else {
            if (lastActivity) {
                const daysSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceActivity > 14)
                    riskScore += 30;
                else if (daysSinceActivity > 7)
                    riskScore += 15;
                else if (daysSinceActivity < 2)
                    riskScore -= 20;
            }
            if (avgQuizScore < 40)
                riskScore += 20;
            else if (avgQuizScore > 80)
                riskScore -= 20;
            if (videoDropoffs > contentViewed * 0.5)
                riskScore += 15;
            if (liveJoins > 3)
                riskScore -= 10;
        }
        riskScore = Math.max(0, Math.min(100, riskScore));
        const strengths = [];
        const weaknesses = [];
        const topicScores = new Map();
        for (const q of quizEvents) {
            const topic = q.payload?.topicId ?? 'general';
            const existing = topicScores.get(topic) ?? { correct: 0, total: 0 };
            existing.total++;
            if (q.payload?.correct)
                existing.correct++;
            topicScores.set(topic, existing);
        }
        for (const [topic, scores] of topicScores) {
            const rate = scores.total > 0 ? scores.correct / scores.total : 0;
            if (rate >= 0.75)
                strengths.push(topic);
            else if (rate < 0.5)
                weaknesses.push(topic);
        }
        const recommendations = await this.generateStudentRecommendations(userId, tenantId, riskScore, avgQuizScore, weaknesses, contentViewed, liveJoins);
        const profile = {
            userId, tenantId, totalEvents: events.length,
            contentViewed, quizAnswered: quizEvents.length, quizCorrect,
            liveJoins, avgQuizScore, lastActivity, riskScore,
            strengths, weaknesses, recommendations,
        };
        try {
            await this.redis.set(`profile:${tenantId}:${userId}`, JSON.stringify(profile), 'EX', 300);
        }
        catch { }
        return profile;
    }
    async generateStudentRecommendations(userId, tenantId, riskScore, avgQuizScore, weaknesses, contentViewed, liveJoins) {
        const recs = [];
        if (riskScore > 70) {
            recs.push({
                type: 'RISK_ALERT',
                reason: 'Öğrenci yüksek risk grubunda — düşük aktivite ve/veya performans',
                payload: { riskScore, urgency: 'high' },
                score: riskScore,
            });
        }
        for (const topic of weaknesses.slice(0, 3)) {
            recs.push({
                type: 'MICRO_CONTENT',
                reason: `"${topic}" konusunda ek çalışma önerilir (düşük başarı oranı)`,
                payload: { topicId: topic, type: 'remediation' },
                score: 75,
            });
        }
        if (avgQuizScore > 70 && contentViewed > 5) {
            recs.push({
                type: 'STUDENT_NEXT_STEP',
                reason: 'İyi performans — bir sonraki modüle geçiş önerilir',
                payload: { action: 'advance_module' },
                score: 80,
            });
        }
        if (liveJoins === 0) {
            recs.push({
                type: 'STUDENT_NEXT_STEP',
                reason: 'Henüz canlı derse katılmadı — etkileşim artırılmalı',
                payload: { action: 'join_live_session' },
                score: 60,
            });
        }
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
    async getContentInsights(tenantId, courseId) {
        const courses = courseId
            ? await this.prisma.course.findMany({ where: { id: courseId, tenantId }, select: { id: true } })
            : await this.prisma.course.findMany({ where: { tenantId }, select: { id: true } });
        const insights = [];
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
            const correct = quizzes.filter((e) => e.payload?.correct).length;
            const avgScore = quizzes.length > 0 ? Math.round((correct / quizzes.length) * 100) : 0;
            const lowTopics = [];
            const revisions = [];
            if (dropoffs > views * 0.3)
                revisions.push('Video içerik uzunluğu kısaltılmalı');
            if (avgScore < 50)
                revisions.push('Quiz zorluk seviyesi gözden geçirilmeli');
            if (views === 0)
                revisions.push('İçerik tanıtımı yapılmalı — görünürlük düşük');
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
    async getAtRiskStudents(tenantId, threshold = 70, limit = 20) {
        const students = await this.prisma.user.findMany({
            where: { tenantId, role: 'STUDENT', isActive: true },
            select: { id: true, email: true, name: true },
            take: 100,
        });
        const atRisk = [];
        for (const student of students) {
            try {
                const cached = await this.redis.get(`profile:${tenantId}:${student.id}`);
                if (cached) {
                    const profile = JSON.parse(cached);
                    if (profile.riskScore >= threshold) {
                        atRisk.push({ userId: student.id, email: student.email, name: student.name, riskScore: profile.riskScore });
                    }
                    continue;
                }
            }
            catch { }
            const eventCount = await this.prisma.learningEvent.count({
                where: { userId: student.id, tenantId },
            });
            const lastEvent = await this.prisma.learningEvent.findFirst({
                where: { userId: student.id, tenantId },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            });
            let risk = 50;
            if (eventCount === 0)
                risk = 90;
            else if (lastEvent) {
                const days = (Date.now() - lastEvent.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                if (days > 14)
                    risk += 30;
                else if (days > 7)
                    risk += 15;
            }
            if (risk >= threshold) {
                atRisk.push({ userId: student.id, email: student.email, name: student.name, riskScore: risk });
            }
        }
        return atRisk
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, limit);
    }
    async getUserRecommendations(userId, tenantId, limit = 10) {
        return this.prisma.recommendation.findMany({
            where: { userId, tenantId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
};
exports.RecommendationService = RecommendationService;
exports.RecommendationService = RecommendationService = RecommendationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(redis_provider_1.REDIS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService, Function])
], RecommendationService);
//# sourceMappingURL=recommendation.service.js.map