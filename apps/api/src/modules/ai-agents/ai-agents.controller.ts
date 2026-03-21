import { Controller, Get, Param, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AiAgentsService } from './ai-agents.service';
import { AiAgentFeedbackDto, AiContextDto } from './dto';

@ApiBearerAuth('access-token')
@ApiTags('ai')
@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiAgentsController {
  constructor(private readonly ai: AiAgentsService) {}

  @Get('agents')
  list(@Req() req: any) {
    return this.ai.listForUser(req.user.id ?? req.user.userId);
  }

  @Post('agents/:id/execute')
  execute(@Param('id') id: string, @Req() req: any) {
    return this.ai.executeAgent(id, req.user.id ?? req.user.userId);
  }

  @Get('agents/:id/logs')
  logs(@Param('id') id: string) {
    return this.ai.getLogs(id);
  }

  @Post('agents/:id/context')
  context(@Param('id') id: string, @Body() dto: AiContextDto) {
    return this.ai.addContext(id, dto);
  }

  @Post('agents/:id/feedback')
  feedback(@Param('id') id: string, @Body() dto: AiAgentFeedbackDto, @Req() req: any) {
    return this.ai.addFeedback(id, dto, req.user.id ?? req.user.userId);
  }
}
