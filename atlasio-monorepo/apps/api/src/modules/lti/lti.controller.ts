import { Body, Controller, Get, Post, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { LtiService } from './lti.service';
import { CreateLtiToolDto, CreateLtiDeploymentDto, LtiLaunchDto, UpdateLtiToolDto } from './dto';

@ApiBearerAuth('access-token')
@ApiTags('lti')
@Controller('lti')
export class LtiController {
  constructor(private readonly service: LtiService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Get('tools')
  listTools() {
    return this.service.listTools();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('tools')
  createTool(@Body() dto: CreateLtiToolDto, @Req() req: any) {
    return this.service.createTool(dto, req.user?.id ?? req.user?.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch('tools/:id')
  updateTool(@Param('id') id: string, @Body() dto: UpdateLtiToolDto, @Req() req: any) {
    return this.service.updateTool(id, dto, req.user?.id ?? req.user?.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Post('deployments')
  createDeployment(@Body() dto: CreateLtiDeploymentDto, @Req() req: any) {
    return this.service.createDeployment(dto, req.user?.id ?? req.user?.userId);
  }

  @Post('launch')
  recordLaunch(@Body() dto: LtiLaunchDto) {
    return this.service.processLaunch(dto);
  }

  @Get('jwks')
  getJwks() {
    return this.service.getJwks();
  }

  @Post('oidc-login')
  oidcLogin(@Body() payload: any) {
    return this.service.initiateOidcLogin(payload);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('tools/:id/deployments')
  deployments(@Param('id') id: string) {
    return this.service.getDeploymentsForTool(id);
  }
}
