import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';





@Module({
  imports: [PrismaModule, EnrollmentsModule],
  controllers: [LessonsController],
  providers: [LessonsService],

})
export class LessonsModule {}
