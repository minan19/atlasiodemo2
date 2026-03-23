import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { BypassAuthGuard } from '../auth/bypass.guard';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  // Client-side collector çağrısı; AUTH_BYPASS dev/test için çalışır, prod'da JWT gerekir.
  @Post('stream')
  async collect(@Body() body: any) {
    return this.telemetry.recordStream(body);
  }

  // Yönetici özeti
  @UseGuards(BypassAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('stream/insights')
  async insights(@Query('tenantId') tenantId?: string) {
    return this.telemetry.streamInsights(tenantId ?? 'public');
  }
}
