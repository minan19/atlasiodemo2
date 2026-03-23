import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { PerformanceService } from './performance.service';

@ApiBearerAuth('access-token')
@ApiTags('performance')
@Controller('performance')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('snapshots')
  list(@Query('limit') limit = '20') {
    const parsed = Math.min(Math.max(Number(limit) || 20, 1), 50);
    return this.service.list(parsed);
  }
}
