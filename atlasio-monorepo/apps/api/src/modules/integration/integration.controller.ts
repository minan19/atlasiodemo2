import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { IntegrationService } from './integration.service';

class ConnectorDto {
  name!: string;
  provider!: string;
  type!: string;
  config!: Record<string, any>;
  enabled?: boolean;
}

@ApiTags('integration')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('integration')
export class IntegrationController {
  constructor(private readonly integration: IntegrationService) {}

  @Get('connectors')
  @Roles('ADMIN', 'INSTRUCTOR')
  connectors(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'];
    return this.integration.listConnectors(tenantId);
  }

  @Post('connectors')
  @Roles('ADMIN')
  upsert(@Body() dto: ConnectorDto, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'];
    return this.integration.upsertConnector(tenantId, dto);
  }
}
