import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DefenseActionState } from '@prisma/client';
import { DefenseService } from './defense.service';
import { DefenseOrchestrator } from './defense.orchestrator';
import {
  CreateDefenseActionDto,
  CreateSecurityEventDto,
} from './dto/create-security-event.dto';

@Controller('defense')
export class DefenseController {
  constructor(
    private readonly defense: DefenseService,
    private readonly orchestrator: DefenseOrchestrator,
  ) {}

  @Post('events')
  createEvent(@Body() dto: CreateSecurityEventDto) {
    return this.defense.createEvent(dto);
  }

  @Get('events')
  listEvents() {
    return this.defense.listEvents();
  }

  @Post('actions')
  createAction(@Body() dto: CreateDefenseActionDto) {
    return this.defense.createAction(dto);
  }

  @Post('actions/:id/state/:state')
  updateActionState(
    @Param('id') id: string,
    @Param('state') state: DefenseActionState,
  ) {
    return this.defense.updateActionState(id, state);
  }

  @Post('actions/:id/apply')
  applyAction(@Param('id') id: string) {
    return this.orchestrator.applyAction(id);
  }

  @Post('actions/:id/rollback')
  rollbackAction(@Param('id') id: string) {
    return this.orchestrator.rollbackAction(id);
  }
}
