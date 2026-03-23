import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { MetricsService } from './metrics.service';

@ApiTags('ops')
@Controller('ops')
export class OpsController {
  constructor(private readonly metrics: MetricsService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('metrics')
  metricsSnapshot() {
    return this.metrics.snapshot();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('metrics/lti')
  ltiMetrics() {
    return this.metrics.ltiMetrics();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('metrics/ai')
  aiMetrics() {
    return this.metrics.aiMetrics();
  }
}
