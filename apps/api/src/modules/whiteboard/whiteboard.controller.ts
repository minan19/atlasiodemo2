import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BypassAuthGuard } from '../auth/bypass.guard';
import { WhiteboardService } from './whiteboard.service';
import { StartWhiteboardDto, CreateLayerDto, DeleteLayerDto, GrantRevokeDto } from './dto';
import { Response } from 'express';

// SmartBoard — AI-powered collaborative workspace
@ApiTags('smartboard')
@ApiBearerAuth('access-token')
@UseGuards(BypassAuthGuard)
@Controller('whiteboard')
export class WhiteboardController {
  constructor(private readonly whiteboard: WhiteboardService) {}

  @Post('start')
  start(@Body() dto: StartWhiteboardDto) {
    return this.whiteboard.start(dto.liveSessionId);
  }

  @Get(':sessionId/actions')
  actions(
    @Param('sessionId') sessionId: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('limit') limit?: string,
    @Query('includeReverted') includeReverted?: string,
    @Query('afterId') afterId?: string,
  ) {
    const sinceDate = since ? new Date(since) : undefined;
    const untilDate = until ? new Date(until) : undefined;
    const take = limit ? Number(limit) : undefined;
    return since || until
      ? this.whiteboard.getActionsRange(
          sessionId,
          sinceDate,
          untilDate,
          take ?? 2000,
          includeReverted === 'true',
          afterId,
        )
      : this.whiteboard.getActions(sessionId, take ?? 500);
  }

  @Get(':sessionId/snapshot')
  snapshot(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
    @Query('includeReverted') includeReverted?: string,
  ) {
    return this.whiteboard.getSnapshot(sessionId, limit ? Number(limit) : 2000, includeReverted === 'true');
  }

  @Post('layer')
  createLayer(@Body() dto: CreateLayerDto, @Req() req: any) {
    return this.whiteboard.createLayer(dto.sessionId, dto.name, req.user?.id);
  }

  @Post('layer/delete')
  deleteLayer(@Body() dto: DeleteLayerDto, @Req() req: any) {
    return this.whiteboard.deleteLayer(dto.sessionId, dto.name, req.user?.id);
  }

  @Get(':sessionId/layers')
  listLayers(@Param('sessionId') sessionId: string) {
    return this.whiteboard.listLayers(sessionId);
  }

  @Get(':sessionId/state')
  state(
    @Param('sessionId') sessionId: string,
    @Query('limitPerLayer') limitPerLayer?: string,
  ) {
    return this.whiteboard.getActiveState(sessionId, limitPerLayer ? Number(limitPerLayer) : 2000);
  }

  @Get(':sessionId/canvas')
  canvas(
    @Param('sessionId') sessionId: string,
    @Query('limitPerLayer') limitPerLayer?: string,
    @Query('gzip') gzip?: string,
    @Res() res?: Response,
  ) {
    const limit = limitPerLayer ? Number(limitPerLayer) : 2000;
    const shouldGzip = gzip === 'true';
    if (!shouldGzip || !res) {
      return this.whiteboard.getActiveCanvas(sessionId, limit);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Encoding', 'gzip');
    const stream = this.whiteboard.getActiveCanvasStream(sessionId, limit);
    stream.pipe(res);
  }

  @Post(':sessionId/ai-assist')
  @ApiOperation({ summary: 'Get AI-generated whiteboard content suggestion' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', example: 'Draw a mind map for photosynthesis' },
        context: { type: 'string', example: 'Current board has a title and two shapes' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'AI suggestion with whiteboard actions returned' })
  aiAssist(
    @Param('sessionId') sessionId: string,
    @Body('prompt') prompt: string,
    @Body('context') context?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id ?? req?.user?.userId;
    return this.whiteboard.aiAssist(sessionId, prompt, context, userId);
  }

  /**
   * Büyük playback isteklerini gzip + chunk ile döndürür.
   */
  @Get(':sessionId/playback-stream')
  async playbackStream(
    @Res() res: Response,
    @Param('sessionId') sessionId: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('limit') limit?: string,
    @Query('includeReverted') includeReverted?: string,
    @Query('afterId') afterId?: string,
    @Query('chunkSize') chunkSize?: string,
    @Query('gzipLevel') gzipLevel?: string,
  ) {
    const sinceDate = since ? new Date(since) : undefined;
    const untilDate = until ? new Date(until) : undefined;
    const take = limit ? Number(limit) : 5000;
    const maxLimit = Number(process.env.WB_PLAYBACK_MAX_LIMIT ?? 20000);
    const maxChunk = Number(process.env.WB_PLAYBACK_MAX_CHUNK ?? 10000);
    const safeLimit = Math.min(take, maxLimit);
    const safeChunk = chunkSize ? Math.min(Number(chunkSize), maxChunk) : undefined;
    const timeoutMs = Number(process.env.WB_PLAYBACK_TIMEOUT_MS ?? 15000);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('X-Playback-Limit', String(safeLimit));
    res.setHeader('X-Playback-Chunk', String(safeChunk ?? 'auto'));

    const streamPromise = this.whiteboard.getActionsStream(
      sessionId,
      sinceDate,
      untilDate,
      safeLimit,
      includeReverted === 'true',
      afterId,
      safeChunk,
      gzipLevel ? Number(gzipLevel) : undefined,
    );

    const timeout = setTimeout(() => {
      res.destroy(new Error('playback timeout'));
    }, timeoutMs);

    try {
      const stream = await streamPromise;
      stream.on('end', () => clearTimeout(timeout));
      stream.on('error', () => clearTimeout(timeout));
      stream.pipe(res);
    } catch (err) {
      clearTimeout(timeout);
      res.status(500).json({ message: 'playback failed', error: (err as Error).message });
    }
  }

  @Post(':sessionId/grant')
  @ApiOperation({ summary: 'Grant write permission to a user for this whiteboard session' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['targetUserId'],
      properties: {
        targetUserId: { type: 'string', example: 'user-uuid-here' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Write access granted' })
  grantWrite(
    @Param('sessionId') sessionId: string,
    @Body() dto: GrantRevokeDto,
    @Req() req: any,
  ) {
    const grantedBy = req?.user?.id ?? req?.user?.userId;
    return this.whiteboard.grantWrite(sessionId, dto.targetUserId, grantedBy);
  }

  @Post(':sessionId/revoke')
  @ApiOperation({ summary: 'Revoke write permission from a user for this whiteboard session' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['targetUserId'],
      properties: {
        targetUserId: { type: 'string', example: 'user-uuid-here' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Write access revoked' })
  revokeWrite(
    @Param('sessionId') sessionId: string,
    @Body() dto: GrantRevokeDto,
    @Req() req: any,
  ) {
    const revokedBy = req?.user?.id ?? req?.user?.userId;
    return this.whiteboard.revokeWrite(sessionId, dto.targetUserId, revokedBy);
  }

  // ── Magic Switch — Whiteboard → Lesson Document ──────────────────────────
  @Post(':sessionId/summarize')
  @ApiOperation({ summary: 'Magic Switch — convert whiteboard content to structured lesson document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { language: { type: 'string', enum: ['tr', 'en'], default: 'tr' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Structured lesson document returned' })
  summarize(
    @Param('sessionId') sessionId: string,
    @Body('language') language: 'tr' | 'en' = 'tr',
  ) {
    return this.whiteboard.summarizeToDocument(sessionId, language);
  }

  // ── AI Brainstorm Sticky Notes ───────────────────────────────────────────
  @Post(':sessionId/sticky-notes')
  @ApiOperation({ summary: 'AI Brainstorm — generate sticky note ideas for a topic' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['topic'],
      properties: {
        topic: { type: 'string', example: 'Photosynthesis' },
        count: { type: 'number', default: 6, minimum: 2, maximum: 12 },
        language: { type: 'string', enum: ['tr', 'en'], default: 'tr' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Sticky note ideas returned' })
  stickyNotes(
    @Param('sessionId') sessionId: string,
    @Body('topic') topic: string,
    @Body('count') count = 6,
    @Body('language') language: 'tr' | 'en' = 'tr',
  ) {
    return this.whiteboard.generateStickyNotes(sessionId, topic, count, language);
  }
}
