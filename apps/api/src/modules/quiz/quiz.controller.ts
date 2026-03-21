import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { NextAdaptiveDto, StartAdaptiveDto } from './dto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AiQuestionService } from './ai-question.service';

@Controller('quiz')
export class QuizController {
  constructor(
    private readonly quiz: QuizService,
    private readonly prisma: PrismaService,
    private readonly ai: AiQuestionService,
  ) {}

  @Post('adaptive/start')
  async start(@Body() body: StartAdaptiveDto) {
    const sessionId = randomUUID();
    const { question, masteryHint } = await this.quiz.pickQuestion({ ...body }, undefined);
    return { sessionId, question, masteryHint };
  }

  @Post('adaptive/next')
  async next(@Body() body: NextAdaptiveDto) {
    await this.quiz.recordAttempt(body.last, undefined);
    const { question, masteryHint } = await this.quiz.pickQuestion(body, undefined);
    return { question, masteryHint };
  }

  @Get('questions')
  async list(@Query('topicId') topicId?: string) {
    const questions = await this.prisma.question.findMany({
      where: { topicId: topicId || undefined },
      include: { choices: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return questions;
  }

  @Get('insights')
  async insights() {
    const perTopic = await this.prisma.quizAttempt.groupBy({
      by: ['tenantId', 'questionId'],
      _count: { _all: true },
      _avg: { durationMs: true },
      where: {},
    });

    // Aggregate per topic accuracy
    const rows = await this.prisma.$queryRawUnsafe(`
      select q."topicId" as "topicId",
             count(*) as attempts,
             sum(case when qa.correct then 1 else 0 end)::float / nullif(count(*),0) * 100 as accuracy
      from "QuizAttempt" qa
      join "Question" q on qa."questionId" = q.id
      group by q."topicId"
      order by attempts desc
    `);
    return rows;
  }

  @Post('ai/generate')
  async generateAi(@Body() body: { topicId: string; count?: number; difficulty?: number; bloom?: string }) {
    const drafts = await this.ai.generateDrafts({
      topicId: body.topicId,
      count: body.count ?? 3,
      difficulty: body.difficulty ?? 2,
    });
    return drafts;
  }

  @Get('ai/drafts')
  async listDrafts() {
    return this.ai.listDrafts();
  }

  @Post('ai/approve')
  async approveDraft(@Body() body: { id: string }) {
    return this.ai.approve(body.id);
  }

  @Post('ai/reject')
  async rejectDraft(@Body() body: { id: string }) {
    return this.ai.reject(body.id);
  }
}
