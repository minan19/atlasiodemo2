import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { VolunteerContentService } from './volunteer-content.service';
import {
  CreateVolunteerContentDto,
  CreateVolunteerFeedbackDto,
  ListVolunteerContentQuery,
  UpdateVolunteerContentStatusDto,
} from './dto';

@ApiTags('volunteer-contents')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('volunteer-contents')
export class VolunteerContentController {
  constructor(private readonly service: VolunteerContentService) {}

  @Post()
  @Roles('INSTRUCTOR')
  create(@Body() dto: CreateVolunteerContentDto, @Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.service.create(dto, userId);
  }

  @Get('me')
  @Roles('INSTRUCTOR')
  listMine(@Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.service.listForInstructor(userId);
  }

  @Post(':id/feedback')
  @Roles('STUDENT', 'INSTRUCTOR')
  submitFeedback(@Param('id') id: string, @Body() dto: CreateVolunteerFeedbackDto, @Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.service.addFeedback(id, dto, userId);
  }

  @Get('admin')
  @Roles('ADMIN')
  adminList(@Query() dto: ListVolunteerContentQuery) {
    return this.service.listForAdmin({ status: dto.status });
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateVolunteerContentStatusDto, @Req() req: any) {
    const actorId = req.user.id ?? req.user.userId;
    return this.service.setStatus(id, dto, actorId);
  }

  @Get('me/score')
  @Roles('INSTRUCTOR')
  myScore(@Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.service.getLatestValueScore(userId);
  }

  @Get('admin/:instructorId/scores')
  @Roles('ADMIN')
  instructorScores(@Param('instructorId') instructorId: string) {
    return this.service.getInstructorScores(instructorId);
  }

  @Get('admin/:instructorId/score')
  @Roles('ADMIN')
  instructorScore(@Param('instructorId') instructorId: string) {
    return this.service.getLatestValueScore(instructorId);
  }

  @Post('admin/:instructorId/scores')
  @Roles('ADMIN')
  recordInstructorScores(@Param('instructorId') instructorId: string, @Req() req: any) {
    const actorId = req.user.id ?? req.user.userId;
    return this.service.recordValueScore(instructorId, actorId);
  }
}
