import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { EnrollmentGuard } from '../enrollments/enrollment.guard';

@ApiTags('lessons')
@Controller()
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Post('courses/:courseId/lessons')
  @ApiBody({ type: CreateLessonDto })
  create(@Param('courseId') courseId: string, @Body() body: CreateLessonDto) {
    return this.lessons.create(courseId, body);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), EnrollmentGuard)
  @Get('courses/:courseId/lessons')
  list(@Param('courseId') courseId: string) {
    return this.lessons.listByCourse(courseId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), EnrollmentGuard)
  @Get('courses/:courseId/lessons/:lessonId')
  get(@Param('courseId') courseId: string, @Param('lessonId') lessonId: string) {
    return this.lessons.get(courseId, lessonId);
  }

  /** POST /courses/:courseId/lessons/:lessonId/complete — dersi tamamla */
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Post('courses/:courseId/lessons/:lessonId/complete')
  complete(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id ?? req.user.userId;
    return this.lessons.markComplete(userId, courseId, lessonId);
  }

  /** GET /courses/:courseId/progress — kurs ilerleme özeti */
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Get('courses/:courseId/progress')
  progress(@Param('courseId') courseId: string, @Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.lessons.courseProgress(userId, courseId);
  }

  /** POST /me/progress/bulk — toplu kurs ilerleme (courseId listesi ile) */
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Post('me/progress/bulk')
  bulkProgress(@Body() body: { courseIds: string[] }, @Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.lessons.allProgress(userId, body.courseIds ?? []);
  }
}
