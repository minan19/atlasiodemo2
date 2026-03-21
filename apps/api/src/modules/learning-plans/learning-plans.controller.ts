import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { AddCourseToLearningPlanDto, AssignLearningPlanDto, CreateLearningPlanDto } from './dto';
import { LearningPlansService } from './learning-plans.service';

@ApiTags('learning-plans')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('learning-plans')
export class LearningPlansController {
  constructor(private readonly plans: LearningPlansService) {}

  @Post()
  create(@Body() dto: CreateLearningPlanDto, @Req() req: any) {
    return this.plans.create(dto, req.user.id ?? req.user.userId);
  }

  @Get()
  list() {
    return this.plans.list();
  }

  @Post(':id/courses')
  addCourse(@Param('id') id: string, @Body() dto: AddCourseToLearningPlanDto, @Req() req: any) {
    return this.plans.addCourse(id, dto, req.user.id ?? req.user.userId);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignLearningPlanDto, @Req() req: any) {
    return this.plans.assign(id, dto.userId, req.user.id ?? req.user.userId);
  }
}
