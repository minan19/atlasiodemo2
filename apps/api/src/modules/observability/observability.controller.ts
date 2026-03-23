import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { ObservabilityService } from './observability.service';

@ApiTags('observability')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('observability')
export class ObservabilityController {
  constructor(private readonly obs: ObservabilityService) {}

  @Get('health-score')
  @Roles('ADMIN')
  healthScore() {
    return this.obs.computeHealthScore();
  }

  @Get('drift')
  @Roles('ADMIN')
  driftAlerts(@Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.obs.checkDrift(tenantId);
  }

  @Get('compliance')
  @Roles('ADMIN')
  compliance(@Req() req: any, @Query('days') days?: string) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.obs.generateComplianceReport(tenantId, days ? parseInt(days, 10) : 30);
  }

  @Get('tenant-dashboard')
  @Roles('ADMIN')
  tenantDashboard(@Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.obs.getTenantDashboard(tenantId);
  }

  @Get('latency')
  @Roles('ADMIN')
  latency(@Query('service') service: string, @Query('operation') operation: string) {
    return this.obs.getLatencyDistribution(service ?? 'api', operation ?? 'request');
  }
}
