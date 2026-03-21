import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { NextAdaptiveDto } from './dto';

type PickedQuestion = {
  id: string;
  stem: string;
  explanation?: string | null;
  difficulty: number;
  topicId: string;
  correctChoiceId: string;
  choices: { id: string; text: string }[];
};

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAttempt(last?: NextAdaptiveDto['last'], userId?: string) {
    if (!last) return;

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        id: randomUUID(),
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

    // DUOLINGO ENTEGRASYONU: Yanlışsa Can (Heart) düşür
    if (userId && !last.correct) {
       const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hearts: true }});
       if (user && user.hearts > 0) {
           await this.prisma.user.update({
              where: { id: userId },
              data: { hearts: { decrement: 1 } }
           });
       }
    }
  }

  /**
   * Spaced Repetition System (SRS) - Unutma Eğrisi Hesaplaması
   * Öğrenci bir konseptte (Mikro-hedef) doğru yaparsa sonraki tekrar tarihi ileri atılır, yanlış yaparsa hemen sorulur.
   */
  private async updateConceptMasteryAndSRS(userId: string, conceptId: string, isCorrect: boolean) {
    const record = await this.prisma.conceptMastery.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });

    let newConsecutiveOk = 0;
    let newMasteryLevel = 0.0;
    let nextReviewDays = 0; // Eğer yanlışsa hemen bugün sorulması için 0

    if (record) {
      newConsecutiveOk = isCorrect ? record.consecutiveOk + 1 : 0;
      newMasteryLevel = isCorrect ? Math.min(1.0, record.masteryLevel + 0.1) : Math.max(0.0, record.masteryLevel - 0.2);
    } else {
      newConsecutiveOk = isCorrect ? 1 : 0;
      newMasteryLevel = isCorrect ? 0.2 : 0.0;
    }

    // SRS Mantığı: 1 doğru -> 1 gün, 2 doğru -> 3 gün, 3 doğru -> 7 gün, 4 doğru -> 14 gün, 5+ -> 30 gün
    if (newConsecutiveOk === 1) nextReviewDays = 1;
    else if (newConsecutiveOk === 2) nextReviewDays = 3;
    else if (newConsecutiveOk === 3) nextReviewDays = 7;
    else if (newConsecutiveOk === 4) nextReviewDays = 14;
    else if (newConsecutiveOk >= 5) nextReviewDays = 30;

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

  /**
   * Kişiselleştirilmiş Şifa (Heal & Practice) Modülü.
   * Öğrencinin en zayıf olduğu mikro-hedeflere (Concepts) yönelik anlık şifa testi üretir.
   */
  async generateHealQuiz(userId: string, topicId: string) {
    // Öğrencinin o konudaki zayıf konseptlerini (Mastery < 0.5) bul
    const weakConcepts = await this.prisma.conceptMastery.findMany({
      where: { userId, Concept: { topicId }, masteryLevel: { lt: 0.5 } },
      take: 5,
      select: { conceptId: true },
    });

    const conceptIds = weakConcepts.map(wc => wc.conceptId);

    // Eğer zayıf konsept yoksa (veya ilk defa ise) SRS zamanı gelmiş olanları bul (Unutma Eğrisi)
    if (conceptIds.length === 0) {
      const srsConcepts = await this.prisma.conceptMastery.findMany({
        where: { userId, Concept: { topicId }, nextReviewAt: { lte: new Date() } },
        take: 5,
        select: { conceptId: true },
      });
      conceptIds.push(...srsConcepts.map(s => s.conceptId));
    }

    if (conceptIds.length === 0) return { message: "Harika! Zayıf noktan veya unutma ihtimalin olan konu yok.", questions: [] };

    // Şifa sorularını çek (Özellikle bu concept'lerden)
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

  async pickQuestion(dto: NextAdaptiveDto, userId?: string): Promise<{ question: PickedQuestion; masteryHint: string }> {
    const topics = dto.topicIds?.length
      ? dto.topicIds
      : (await this.prisma.topic.findMany({ select: { id: true } })).map((t: any) => t.id);

    const exclude = dto.excludeIds ?? [];

    // Item Response Theory (IRT) Inspired Adaptivity
    // Calculate student ability based on past attempts in these topics
    let studentAbility = 1; // Default to easiest (1)

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
             if (attempt.correct) score += weight;
             else score -= (weight * 0.5); // Penalty for missing easy questions is higher in IRT context, simplified here
         }

         // Smooth out ability estimate between 1 and 3
         if (score > 15) studentAbility = 3;
         else if (score > 5) studentAbility = 2;
         else studentAbility = 1;
       }
    }

    // Dynamic difficulty tracking based on last answer
    let targetDifficulty = studentAbility;
    if (dto.last) {
      if (dto.last.correct) {
          targetDifficulty = Math.min(3, studentAbility + 1);
      } else {
          targetDifficulty = Math.max(1, studentAbility - 1);
      }
    }

    // Pick question matching exact target difficulty
    const question = await this.prisma.question.findFirst({
      where: {
        topicId: { in: topics },
        id: { notIn: exclude },
        difficulty: targetDifficulty,
      },
      include: { choices: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Fallback: If exact difficulty not found, find the closest available difficulty
    let picked = question;
    if (!picked) {
      picked = await this.prisma.question.findFirst({
          where: { topicId: { in: topics }, id: { notIn: exclude } },
          include: { choices: true },
          orderBy: { difficulty: targetDifficulty === 1 ? 'asc' : 'desc' } // Closer to what we need
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
        choices: picked.choices.map((c: any) => ({ id: c.id, text: c.text })),
      },
      masteryHint,
    };
  }

  private async topicHint(topicId: string): Promise<string> {
    const total = await this.prisma.quizAttempt.count({ where: { Question: { topicId } } });
    const correct = await this.prisma.quizAttempt.count({ where: { Question: { topicId }, correct: true } });
    if (!total) return 'Yeni konu, veri yok.';
    const rate = Math.round((correct / total) * 100);
    if (rate >= 80) return `Konu hakimiyeti yüksek (%${rate}). Bir üst zorluğa geçin.`;
    if (rate >= 50) return `Orta seviye (%${rate}). Birkaç pratik daha önerilir.`;
    return `Düşük hakimiyet (%${rate}). Pekiştirme quizleri önerilir.`;
  }
}
