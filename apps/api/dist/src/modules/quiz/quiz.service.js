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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
let QuizService = class QuizService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordAttempt(last, userId) {
        if (!last)
            return;
        const attempt = await this.prisma.quizAttempt.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                userId,
                questionId: last.questionId,
                correct: last.correct,
                durationMs: last.durationMs,
            },
            include: { Question: true }
        });
        if (userId && attempt.Question.conceptId) {
            await this.updateConceptMasteryAndSRS(userId, attempt.Question.conceptId, last.correct);
        }
        if (userId && !last.correct) {
            const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hearts: true } });
            if (user && user.hearts > 0) {
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { hearts: { decrement: 1 } }
                });
            }
        }
    }
    async updateConceptMasteryAndSRS(userId, conceptId, isCorrect) {
        const record = await this.prisma.conceptMastery.findUnique({
            where: { userId_conceptId: { userId, conceptId } },
        });
        let newConsecutiveOk = 0;
        let newMasteryLevel = 0.0;
        let nextReviewDays = 0;
        if (record) {
            newConsecutiveOk = isCorrect ? record.consecutiveOk + 1 : 0;
            newMasteryLevel = isCorrect ? Math.min(1.0, record.masteryLevel + 0.1) : Math.max(0.0, record.masteryLevel - 0.2);
        }
        else {
            newConsecutiveOk = isCorrect ? 1 : 0;
            newMasteryLevel = isCorrect ? 0.2 : 0.0;
        }
        if (newConsecutiveOk === 1)
            nextReviewDays = 1;
        else if (newConsecutiveOk === 2)
            nextReviewDays = 3;
        else if (newConsecutiveOk === 3)
            nextReviewDays = 7;
        else if (newConsecutiveOk === 4)
            nextReviewDays = 14;
        else if (newConsecutiveOk >= 5)
            nextReviewDays = 30;
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + nextReviewDays);
        await this.prisma.conceptMastery.upsert({
            where: { userId_conceptId: { userId, conceptId } },
            create: {
                userId,
                conceptId,
                masteryLevel: newMasteryLevel,
                consecutiveOk: newConsecutiveOk,
                lastReviewedAt: new Date(),
                nextReviewAt: nextReviewDate,
            },
            update: {
                masteryLevel: newMasteryLevel,
                consecutiveOk: newConsecutiveOk,
                lastReviewedAt: new Date(),
                nextReviewAt: nextReviewDate,
            },
        });
    }
    async generateHealQuiz(userId, topicId) {
        const weakConcepts = await this.prisma.conceptMastery.findMany({
            where: { userId, Concept: { topicId }, masteryLevel: { lt: 0.5 } },
            take: 5,
            select: { conceptId: true },
        });
        const conceptIds = weakConcepts.map(wc => wc.conceptId);
        if (conceptIds.length === 0) {
            const srsConcepts = await this.prisma.conceptMastery.findMany({
                where: { userId, Concept: { topicId }, nextReviewAt: { lte: new Date() } },
                take: 5,
                select: { conceptId: true },
            });
            conceptIds.push(...srsConcepts.map(s => s.conceptId));
        }
        if (conceptIds.length === 0)
            return { message: "Harika! Zayıf noktan veya unutma ihtimalin olan konu yok.", questions: [] };
        const healQuestions = await this.prisma.question.findMany({
            where: { conceptId: { in: conceptIds } },
            include: { choices: true, Concept: true },
            take: 5,
        });
        return {
            message: "Senin için özel bir zayıflık onarım (Heal) testi hazırladım.",
            questions: healQuestions.map(q => ({
                id: q.id,
                conceptName: q.Concept?.name,
                stem: q.stem,
                difficulty: q.difficulty,
                choices: q.choices.map(c => ({ id: c.id, text: c.text })),
            }))
        };
    }
    async pickQuestion(dto, userId) {
        const topics = dto.topicIds?.length
            ? dto.topicIds
            : (await this.prisma.topic.findMany({ select: { id: true } })).map((t) => t.id);
        const exclude = dto.excludeIds ?? [];
        let studentAbility = 1;
        if (userId) {
            const pastAttempts = await this.prisma.quizAttempt.findMany({
                where: { userId, Question: { topicId: { in: topics } } },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: { Question: true }
            });
            if (pastAttempts.length > 0) {
                let score = 0;
                for (const attempt of pastAttempts) {
                    const weight = attempt.Question.difficulty;
                    if (attempt.correct)
                        score += weight;
                    else
                        score -= (weight * 0.5);
                }
                if (score > 15)
                    studentAbility = 3;
                else if (score > 5)
                    studentAbility = 2;
                else
                    studentAbility = 1;
            }
        }
        let targetDifficulty = studentAbility;
        if (dto.last) {
            if (dto.last.correct) {
                targetDifficulty = Math.min(3, studentAbility + 1);
            }
            else {
                targetDifficulty = Math.max(1, studentAbility - 1);
            }
        }
        const question = await this.prisma.question.findFirst({
            where: {
                topicId: { in: topics },
                id: { notIn: exclude },
                difficulty: targetDifficulty,
            },
            include: { choices: true },
            orderBy: { updatedAt: 'desc' },
        });
        let picked = question;
        if (!picked) {
            picked = await this.prisma.question.findFirst({
                where: { topicId: { in: topics }, id: { notIn: exclude } },
                include: { choices: true },
                orderBy: { difficulty: targetDifficulty === 1 ? 'asc' : 'desc' }
            });
        }
        if (!picked) {
            throw new Error('Soru bulunamadı');
        }
        const masteryHint = await this.topicHint(picked.topicId);
        return {
            question: {
                id: picked.id,
                stem: picked.stem,
                explanation: picked.explanation,
                difficulty: picked.difficulty,
                topicId: picked.topicId,
                correctChoiceId: picked.correctChoiceId,
                choices: picked.choices.map((c) => ({ id: c.id, text: c.text })),
            },
            masteryHint,
        };
    }
    async topicHint(topicId) {
        const total = await this.prisma.quizAttempt.count({ where: { Question: { topicId } } });
        const correct = await this.prisma.quizAttempt.count({ where: { Question: { topicId }, correct: true } });
        if (!total)
            return 'Yeni konu, veri yok.';
        const rate = Math.round((correct / total) * 100);
        if (rate >= 80)
            return `Konu hakimiyeti yüksek (%${rate}). Bir üst zorluğa geçin.`;
        if (rate >= 50)
            return `Orta seviye (%${rate}). Birkaç pratik daha önerilir.`;
        return `Düşük hakimiyet (%${rate}). Pekiştirme quizleri önerilir.`;
    }
};
exports.QuizService = QuizService;
exports.QuizService = QuizService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuizService);
//# sourceMappingURL=quiz.service.js.map