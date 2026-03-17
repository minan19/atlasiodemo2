import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { AdminReportsService } from './admin-reports.service';

@ApiTags('admin-reports')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly svc: AdminReportsService) {}

  @Get('finance')
  finance() {
    return this.svc.finance();
  }

  @Get('intel')
  intel() {
    return this.svc.intel();
  }

  @Get('sales-ai')
  salesAi() {
    return this.svc.salesAi();
  }

  @Get('kpi')
  kpi() {
    return this.svc.kpi();
  }

  @Get('tenants')
  tenants() {
    return this.svc.tenants();
  }

  @Get('system-health')
  systemHealth() {
    return this.svc.systemHealth();
  }
}
