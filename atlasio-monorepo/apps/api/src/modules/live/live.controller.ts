import { Body, Controller, Get, Patch, Post, Query, Req, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { LiveService } from './live.service';
import {
  CreateLiveSessionDto,
  UpdateLiveSessionDto,
  ParticipantStateDto,
  PresentationRequestDto,
  PresentationResponseDto,
  CommunicationDto,
  LiveChatDto,
  CreateLegacyLiveDto,
  JoinLegacyDto,
} from './dto';
import { LiveJoinGuard } from './live.join.guard';

@ApiTags('live')
@Controller('live')
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Post('sessions')
  createSession(@Body() dto: CreateLiveSessionDto, @Req() req: any) {
    return this.live.createSession(dto, req.user.id ?? req.user.userId);
  }

  // Legacy live session (class_code) for quick breakout / attendance
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Post('legacy')
  createLegacy(@Body() dto: CreateLegacyLiveDto) {
    return this.live.createLegacySession(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), LiveJoinGuard)
  @Post('sessions/:id/join')
  join(@Param('id') id: string, @Req() req: any) {
    return this.live.joinSession(id, req.user.id ?? req.user.userId, req.user.role ?? req.user.roles?.[0]);
  }

  @Post('legacy/join')
  joinLegacy(@Body() dto: JoinLegacyDto) {
    return this.live.joinLegacy(dto.sessionId, dto.studentId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Get('legacy/list')
  listLegacy() {
    return this.live.listLegacy();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Patch('sessions/:id')
  updateSession(@Param('id') id: string, @Body() dto: UpdateLiveSessionDto, @Req() req: any) {
    return this.live.updateSession(id, dto, req.user.id ?? req.user.userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Post('sessions/:id/participants')
  addParticipant(@Param('id') sessionId: string, @Body() dto: ParticipantStateDto) {
    return this.live.addParticipant(sessionId, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Post('presentations')
  requestPresentation(@Body() dto: PresentationRequestDto, @Req() req: any) {
    return this.live.requestPresentation(dto, req.user.id ?? req.user.userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Post('presentations/respond')
  respondPresentation(@Body() dto: PresentationResponseDto, @Req() req: any) {
    return this.live.respondPresentation(dto, req.user.id ?? req.user.userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Post('messages')
  sendMessage(@Body() dto: CommunicationDto, @Req() req: any) {
    return this.live.sendMessage(dto, req.user.id ?? req.user.userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Post('chat')
  sendChat(@Body() dto: LiveChatDto, @Req() req: any) {
    return this.live.sendMessage(
      { sessionId: dto.sessionId, type: 'CHAT', content: dto.content },
      req.user.id ?? req.user.userId,
    );
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Get('sessions')
  listSessions(@Query('courseId') courseId?: string) {
    return this.live.listSessions(courseId);
  }
}
