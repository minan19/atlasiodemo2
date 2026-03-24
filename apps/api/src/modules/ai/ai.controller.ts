import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import {
  AIService,
  BulkGenerateDto,
  ExpandContentDto,
  GenerateContentDto,
  GenerateMindMapDto,
  GeneratePresentationDto,
  RewriteContentDto,
} from './ai.service';
import { LearningEventType, RecommendationType } from '@prisma/client';

class LearningEventDto {
  eventType!: LearningEventType;
  payload?: Record<string, any>;
}

class RecommendationDto {
  type!: RecommendationType;
  payload!: Record<string, any>;
  reason!: string;
}

class RecommendationQueryDto {
  userId?: string;
  courseId?: string;
}

@ApiTags('ai')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('ai')
export class AIModuleController {
  constructor(private readonly ai: AIService) {}

  @Post('events')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  recordEvent(@Body() dto: LearningEventDto, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.user.id ?? req.user.userId;
    return this.ai.recordLearningEvent({ tenantId, userId, eventType: dto.eventType, payload: dto.payload });
  }

  @Post('recommendations')
  @Roles('ADMIN', 'INSTRUCTOR')
  createRecommendation(@Body() dto: RecommendationDto, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.user.id ?? req.user.userId;
    return this.ai.proposeRecommendation(tenantId, userId, dto.type, dto.payload, dto.reason);
  }

  @Get('recommendations')
  @Roles('ADMIN', 'INSTRUCTOR')
  getRecommendations(@Query() dto: RecommendationQueryDto, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'];
    return this.ai.getRecommendations(tenantId, { userId: dto.userId, courseId: dto.courseId });
  }

  @Post('content/generate')
  @Roles('ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Generate structured AI educational content' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['topic', 'type'],
      properties: {
        topic: { type: 'string', example: 'Photosynthesis' },
        type: { type: 'string', enum: ['lesson', 'quiz', 'course_outline', 'summary'] },
        language: { type: 'string', enum: ['tr', 'en'], default: 'en' },
        difficulty: { type: 'number', enum: [1, 2, 3], default: 2 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Generated content returned' })
  generateContent(@Body() dto: GenerateContentDto, @Req() req: any) {
    const actorId = req.user?.id ?? req.user?.userId;
    return this.ai.generateContent(dto, actorId);
  }

  // ── Magic Expand ─────────────────────────────────────────────────────────
  @Post('content/expand')
  @Roles('ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Magic Expand — short text → full educational content' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string', example: 'Photosynthesis converts light to energy.' },
        targetLength: { type: 'string', enum: ['short', 'medium', 'long'], default: 'medium' },
        language: { type: 'string', enum: ['tr', 'en'], default: 'tr' },
      },
    },
  })
  expandContent(@Body() dto: ExpandContentDto, @Req() req: any) {
    const actorId = req.user?.id ?? req.user?.userId;
    return this.ai.expandContent(dto, actorId);
  }

  // ── Magic Write (rewrite) ────────────────────────────────────────────────
  @Post('content/rewrite')
  @Roles('ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Magic Write — rewrite content with specified tone' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string' },
        tone: { type: 'string', enum: ['formal', 'casual', 'academic', 'simple'], default: 'formal' },
        language: { type: 'string', enum: ['tr', 'en'], default: 'tr' },
      },
    },
  })
  rewriteContent(@Body() dto: RewriteContentDto, @Req() req: any) {
    const actorId = req.user?.id ?? req.user?.userId;
    return this.ai.rewriteContent(dto, actorId);
  }

  // ── Bulk Generate ────────────────────────────────────────────────────────
  @Post('content/bulk-generate')
  @Roles('ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Bulk Create — generate content for multiple topics at once (max 10)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['topics', 'type'],
      properties: {
        topics: { type: 'array', items: { type: 'string' }, example: ['Photosynthesis', 'Cell Division'] },
        type: { type: 'string', enum: ['lesson', 'quiz', 'course_outline', 'summary'] },
        language: { type: 'string', enum: ['tr', 'en'], default: 'tr' },
        difficulty: { type: 'number', enum: [1, 2, 3], default: 2 },
      },
    },
  })
  bulkGenerate(@Body() dto: BulkGenerateDto, @Req() req: any) {
    const actorId = req.user?.id ?? req.user?.userId;
    return this.ai.bulkGenerate(dto, actorId);
  }

  // ── Magic Design — Presentation ──────────────────────────────────────────
  @Post('presentation/generate')
  @Roles('ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Magic Design — generate full slide deck from topic' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['topic'],
      properties: {
        topic: { type: 'string', example: 'Machine Learning Basics' },
        slideCount: { type: 'number', default: 8, minimum: 3, maximum: 20 },
        language: { type: 'string', enum: ['tr', 'en'], default: 'tr' },
        difficulty: { type: 'number', enum: [1, 2, 3], default: 2 },
      },
    },
  })
  generatePresentation(@Body() dto: GeneratePresentationDto, @Req() req: any) {
    const actorId = req.user?.id ?? req.user?.userId;
    return this.ai.generatePresentation(dto, actorId);
  }

  // ── Mind Map ─────────────────────────────────────────────────────────────
  @Post('mind-map')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  @ApiOperation({ summary: 'Generate AI mind map for a topic' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['topic'],
      properties: {
        topic: { type: 'string', example: 'Photosynthesis' },
        depth: { type: 'number', default: 2, minimum: 1, maximum: 4 },
        language: { type: 'string', enum: ['tr', 'en'], default: 'tr' },
      },
    },
  })
  generateMindMap(@Body() dto: GenerateMindMapDto, @Req() req: any) {
    const actorId = req.user?.id ?? req.user?.userId;
    return this.ai.generateMindMap(dto, actorId);
  }
}
