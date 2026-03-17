import { Module } from '@nestjs/common';
import { LearningPlansController } from './learning-plans.controller';
import { LearningPlansService } from './learning-plans.service';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [EnrollmentsModule],
  controllers: [LearningPlansController],
  providers: [LearningPlansService],
})
export class LearningPlansModule {}
