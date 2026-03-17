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
    await this.prisma.quizAttempt.create({
      data: {
        id: randomUUID(),
        userId,
        questionId: last.questionId,
        correct: last.correct,
        durationMs: last.durationMs,
      },
    });
  }

  async pickQuestion(dto: NextAdaptiveDto, userId?: string): Promise<{ question: PickedQuestion; masteryHint: string }> {
    const topics = dto.topicIds?.length
      ? dto.topicIds
      : (await this.prisma.topic.findMany({ select: { id: true } })).map((t: any) => t.id);

    const exclude = dto.excludeIds ?? [];

    // simple adaptivity: if last incorrect -> same difficulty, if correct -> try harder
    const targetDifficulty = dto.last ? Math.min(3, Math.max(1, (dto.last.correct ? 1 : 0) + 2)) : 1;

    const question = await this.prisma.question.findFirst({
      where: {
        topicId: { in: topics },
        id: { notIn: exclude },
        difficulty: targetDifficulty,
      },
      include: { choices: true },
      orderBy: { updatedAt: 'desc' },
    });

    // fallback any difficulty
    const picked = question
      ? question
      : await this.prisma.question.findFirst({
          where: { topicId: { in: topics }, id: { notIn: exclude } },
          include: { choices: true },
        });

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
