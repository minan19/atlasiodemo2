import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CourseMaterialService } from './course-material.service';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, CourseMaterialService],
  exports: [CoursesService, CourseMaterialService],
})
export class CoursesModule {}
