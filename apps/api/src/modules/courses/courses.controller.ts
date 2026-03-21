import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { CreateCourseDto, PublishCourseDto, CreateCourseScheduleDto } from './dto';
import { CoursesService } from './courses.service';

@ApiBearerAuth('access-token')
@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get('published')
  listPublished(@Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.courses.listPublished(tenantId);
  }

  @Get('published/:id')
  getPublished(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.courses.getPublished(id, tenantId);
  }

  @Get(':id/schedule')
  getSchedule(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.courses.listSchedule(id, tenantId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Get()
  listAll(@Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.courses.listAll(tenantId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Post()
  create(@Body() dto: CreateCourseDto, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.courses.create(dto, req.user.id ?? req.user.userId, tenantId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Post(':id/schedule')
  addSchedule(@Param('id') id: string, @Body() dto: CreateCourseScheduleDto, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.courses.addSchedule(id, dto, req.user.id ?? req.user.userId, req.user.role ?? req.user.roles?.[0], tenantId);
  }

  @Get(':id/schedule/ics')
  async downloadIcs(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    const ics = await this.courses.scheduleIcs(id, tenantId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="course-${id}-schedule.ics"`);
    return res.send(ics);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/publish')
  publish(@Param('id') id: string, @Body() dto: PublishCourseDto, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.courses.publish(id, dto.isPublished, req.user.id ?? req.user.userId, tenantId);
  }
}
