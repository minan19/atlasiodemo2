import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { AiSafetyService } from './ai-safety.service';

class SafetyCheckDto {
  text!: string;
}

class ModelAccessDto {
  modelId!: string;
  maxTokens?: number;
  temperature?: number;
}

@ApiTags('ai-safety')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('ai-safety')
export class AiSafetyController {
  constructor(private readonly safety: AiSafetyService) {}

  @Post('check-input')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  async checkInput(@Body() dto: SafetyCheckDto, @Req() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.safety.checkInput(dto.text, userId, tenantId);
  }

  @Post('check-output')
  @Roles('ADMIN', 'INSTRUCTOR')
  async checkOutput(@Body() dto: SafetyCheckDto, @Req() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.safety.checkOutput(dto.text, userId);
  }

  @Post('mask-pii')
  @Roles('ADMIN', 'INSTRUCTOR')
  maskPii(@Body() dto: SafetyCheckDto) {
    return this.safety.maskPii(dto.text);
  }

  @Post('check-model')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  checkModelAccess(@Body() dto: ModelAccessDto, @Req() req: any) {
    const role = req.user?.role ?? 'STUDENT';
    return this.safety.validateAiRequest(dto.modelId, {
      role,
      maxTokens: dto.maxTokens,
      temperature: dto.temperature,
    });
  }

  @Get('stats')
  @Roles('ADMIN')
  async getSafetyStats(
    @Req() req: any,
    @Query('days') days?: string,
  ) {
    const tenantId = req.tenantId ?? req.user?.tenantId;
    return this.safety.getSafetyStats(tenantId, days ? parseInt(days, 10) : 30);
  }
}
