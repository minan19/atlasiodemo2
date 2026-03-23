import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { AIService, GenerateContentDto } from './ai.service';
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
}
