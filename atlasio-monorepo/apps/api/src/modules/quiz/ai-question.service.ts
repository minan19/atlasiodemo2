import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

type GenerateInput = {
  topicId: string;
  count: number;
  difficulty?: number;
  bloom?: string;
  createdBy?: string;
};

@Injectable()
export class AiQuestionService {
  private readonly logger = new Logger(AiQuestionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateDrafts(input: GenerateInput) {
    const topic = await this.prisma.topic.findUnique({ where: { id: input.topicId } });
    if (!topic) throw new Error('Topic not found');

    const drafts: Array<{
      id: string;
      topicId: string;
      stem: string;
      explanation: string;
      difficulty: number;
      status: string;
      sourceType: string;
      correctChoiceId: string;
      choices: { id: string; text: string; isCorrect: boolean }[];
      createdBy?: string;
    }> = [];
    for (let i = 0; i < input.count; i++) {
      const stem = `(${topic.name}) Otomatik soru ${i + 1}: ${this.placeholderPrompt(topic.name, input.difficulty)}`;
      const choices = [
        { id: randomUUID(), text: 'Seçenek A', isCorrect: false },
        { id: randomUUID(), text: 'Seçenek B', isCorrect: true },
        { id: randomUUID(), text: 'Seçenek C', isCorrect: false },
      ];
      const correctChoiceId = choices.find((c) => c.isCorrect)!.id;
      drafts.push({
        id: randomUUID(),
        topicId: topic.id,
        stem,
        explanation: 'AI taslak açıklama',
        difficulty: input.difficulty ?? 2,
        status: 'DRAFT',
        sourceType: 'AI',
        correctChoiceId,
        choices,
        createdBy: input.createdBy,
      });
    }

    await Promise.all(
      drafts.map(async (d) => {
        await this.prisma.question.create({
          data: {
            id: d.id,
            topicId: d.topicId,
            stem: d.stem,
            explanation: d.explanation,
            difficulty: d.difficulty,
            status: d.status,
            sourceType: d.sourceType,
            correctChoiceId: d.correctChoiceId,
            createdBy: d.createdBy,
            choices: { createMany: { data: d.choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })) } },
          },
        });
      }),
    );

    this.logger.log(`Generated ${drafts.length} AI draft questions for topic ${topic.name}`);
    return drafts.map((d) => ({ id: d.id, stem: d.stem, status: d.status }));
  }

  async listDrafts() {
    return this.prisma.question.findMany({
      where: { status: 'DRAFT' },
      include: { choices: true, Topic: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async approve(id: string) {
    return this.prisma.question.update({ where: { id }, data: { status: 'APPROVED', updatedAt: new Date() } });
  }

  async reject(id: string) {
    await this.prisma.questionChoice.deleteMany({ where: { questionId: id } });
    return this.prisma.question.delete({ where: { id } });
  }

  private placeholderPrompt(topic: string, difficulty?: number) {
    const diff = difficulty === 3 ? 'ileri' : difficulty === 1 ? 'kolay' : 'orta';
    return `${diff} seviye kavramsal kontrol sorusu`;
  }
}
