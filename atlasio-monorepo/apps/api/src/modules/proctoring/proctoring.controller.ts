import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProctoringService } from './proctoring.service';
import { ProctorEventDto, StartProctorSessionDto } from './dto';

@ApiTags('proctoring')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('proctor')
export class ProctoringController {
  constructor(private readonly proctoring: ProctoringService) {}

  @Post('sessions')
  start(@Req() req: any, @Body() dto: StartProctorSessionDto) {
    return this.proctoring.startSession(req.user.id ?? req.user.userId, dto);
  }

  @Post('events')
  ingest(@Req() req: any, @Body() dto: ProctorEventDto) {
    // userId kullanılabilir; şimdilik session sahipliği kontrolü ileride eklenecek
    return this.proctoring.ingestEvent(req.user.id ?? req.user.userId, dto);
  }

  @Get('score/:sessionId')
  getScore(@Param('sessionId') sessionId: string) {
    return this.proctoring.getScore(sessionId);
  }
}
