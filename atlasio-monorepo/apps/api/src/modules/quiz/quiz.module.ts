import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiQuestionService } from './ai-question.service';

@Module({
  imports: [PrismaModule],
  controllers: [QuizController],
  providers: [QuizService, AiQuestionService],
  exports: [QuizService],
})
export class QuizModule {}
