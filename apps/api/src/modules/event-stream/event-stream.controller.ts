import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { EventStreamService } from './event-stream.service';
import { LearningEventType } from '@prisma/client';

// ─── DTOs ────────────────────────────────────────────────────────────────────

class EmitEventDto {
  eventType!: LearningEventType;
  objectType!: string;
  objectId!: string;
  objectName?: string;
  result?: Record<string, any>;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

class ForwardLrsDto {
  lrsUrl!: string;
  authHeader!: string;
  format!: 'xapi' | 'caliper';
  from?: string;
  to?: string;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('event-stream')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('event-stream')
export class EventStreamController {
  constructor(private readonly eventStream: EventStreamService) {}

  // ─── Emit Event ──────────────────────────────────────────────────────────

  @Post('emit')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  async emitEvent(@Body() dto: EmitEventDto, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    const userId = req.user?.id ?? req.user?.userId;
    return this.eventStream.emit({
      tenantId,
      userId,
      eventType: dto.eventType,
      objectType: dto.objectType,
      objectId: dto.objectId,
      objectName: dto.objectName,
      result: dto.result,
      context: dto.context,
      metadata: dto.metadata,
    });
  }

  // ─── Query Events ────────────────────────────────────────────────────────

  @Get('events')
  @Roles('ADMIN', 'INSTRUCTOR')
  async getEvents(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('eventType') eventType?: LearningEventType,
    @Query('objectType') objectType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.eventStream.getEvents(tenantId, {
      userId,
      eventType,
      objectType,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // ─── Analytics Dashboard ─────────────────────────────────────────────────

  @Get('analytics')
  @Roles('ADMIN', 'INSTRUCTOR')
  async getAnalytics(
    @Req() req: any,
    @Query('days') days?: string,
  ) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.eventStream.getEventAnalytics(tenantId, days ? parseInt(days, 10) : 30);
  }

  // ─── Real-time Counts ────────────────────────────────────────────────────

  @Get('realtime')
  @Roles('ADMIN', 'INSTRUCTOR')
  async getRealtimeCounts(
    @Req() req: any,
    @Query('date') date?: string,
  ) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.eventStream.getRealtimeCounts(tenantId, date);
  }

  // ─── xAPI Export ─────────────────────────────────────────────────────────

  @Get('export/xapi')
  @Roles('ADMIN')
  async exportXApi(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.eventStream.exportXApiStatements(tenantId, from, to, limit ? parseInt(limit, 10) : 100);
  }

  // ─── Caliper Export ──────────────────────────────────────────────────────

  @Get('export/caliper')
  @Roles('ADMIN')
  async exportCaliper(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.eventStream.exportCaliperEvents(tenantId, from, to, limit ? parseInt(limit, 10) : 100);
  }

  // ─── Forward to External LRS ─────────────────────────────────────────────

  @Post('forward-lrs')
  @Roles('ADMIN')
  async forwardToLrs(@Body() dto: ForwardLrsDto, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.eventStream.forwardToLrs(tenantId, dto.lrsUrl, dto.authHeader, dto.format, dto.from, dto.to);
  }
}
