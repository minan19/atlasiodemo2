import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { InstructorInsightsService } from './instructor-insights.service';
import { ClassInsightsQueryDto } from './dto/class-insights.query.dto';
import { StudentInsightsQueryDto } from './dto/student-insights.query.dto';
import { CreateInstructorActionDto } from './dto/create-action.dto';
import { ListActionsQueryDto } from './dto/list-actions.query.dto';
import { UpdateInstructorActionDto } from './dto/update-action.dto';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { Body, Patch, Post } from '@nestjs/common';

@ApiBearerAuth('access-token')
@ApiTags('instructor-insights')
@Controller('instructor')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('instructor', 'admin')
export class InstructorInsightsController {
  constructor(private readonly service: InstructorInsightsService) {}

  @Get('classes/:classId/insights')
  async getClassInsights(
    @Param('classId') classId: string,
    @Query() query: ClassInsightsQueryDto,
    @Req() req: any,
  ) {
    const window = query.window ?? '30d';
    return this.service.getClassInsights({
      classId,
      window,
      requester: { id: req.user?.id ?? req.user?.userId, role: req.user?.role, tenantId: req.user?.tenantId },
    });
  }

  @Get('classes/:classId/students/:studentId/insights')
  async getStudentInsights(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @Query() query: StudentInsightsQueryDto,
    @Req() req: any,
  ) {
    const window = query.window ?? '30d';
    return this.service.getStudentInsights({
      classId,
      studentId,
      window,
      requester: { id: req.user?.id ?? req.user?.userId, role: req.user?.role, tenantId: req.user?.tenantId },
    });
  }

  @Post('actions')
  async createAction(@Body() dto: CreateInstructorActionDto, @Req() req: any) {
    return this.service.createInstructorAction({
      dto,
      requester: { id: req.user?.id ?? req.user?.userId, role: req.user?.role, tenantId: req.user?.tenantId },
    });
  }

  @Get('actions')
  async listActions(@Query() query: ListActionsQueryDto, @Req() req: any) {
    return this.service.listInstructorActions({
      query,
      requester: { id: req.user?.id ?? req.user?.userId, role: req.user?.role, tenantId: req.user?.tenantId },
    });
  }

  @Patch('actions/:actionId')
  async updateAction(
    @Param('actionId') actionId: string,
    @Body() dto: UpdateInstructorActionDto,
    @Req() req: any,
  ) {
    return this.service.updateInstructorAction({
      actionId,
      dto,
      requester: { id: req.user?.id ?? req.user?.userId, role: req.user?.role, tenantId: req.user?.tenantId },
    });
  }
}
