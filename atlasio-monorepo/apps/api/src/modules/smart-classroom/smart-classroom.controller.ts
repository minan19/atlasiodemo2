import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles';
import { SmartClassroomService } from './smart-classroom.service';

@Controller('smart-classroom')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SmartClassroomController {
  constructor(private service: SmartClassroomService) {}

  @Get(':liveSessionId')
  getStatus(@Param('liveSessionId') sessionId: string) {
    return this.service.getStatus(sessionId);
  }

  @Roles('ADMIN', 'INSTRUCTOR')
  @Post(':liveSessionId/control')
  updateEnv(@Param('liveSessionId') sessionId: string, @Body() dto: any, @Req() req: any) {
    const instructorId = req.user.id || req.user.userId;
    return this.service.updateEnvironment(sessionId, instructorId, dto);
  }
}
