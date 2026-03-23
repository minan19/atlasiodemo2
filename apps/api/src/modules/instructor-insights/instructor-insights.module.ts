import { Module } from '@nestjs/common';
import { InstructorInsightsController } from './instructor-insights.controller';
import { InstructorInsightsService } from './instructor-insights.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InfraModule } from '../../infra/infra.module';
import { InstructorInsightsCache } from './instructor-insights.cache';
import { MeActionsController } from './me-actions.controller';

@Module({
  imports: [PrismaModule, InfraModule],
  controllers: [InstructorInsightsController, MeActionsController],
  providers: [InstructorInsightsService, InstructorInsightsCache],
  exports: [InstructorInsightsService, InstructorInsightsCache],
})
export class InstructorInsightsModule {}
