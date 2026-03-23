import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { AIService } from './ai.service';
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
}
