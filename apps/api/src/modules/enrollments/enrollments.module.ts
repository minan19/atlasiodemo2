import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentGuard } from './enrollment.guard';

@Module({
  imports: [PrismaModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService, EnrollmentGuard],
  exports: [EnrollmentsService, EnrollmentGuard],
})
export class EnrollmentsModule {}
