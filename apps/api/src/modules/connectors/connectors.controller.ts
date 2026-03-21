import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { ConnectorsService } from './connectors.service';

@ApiTags('connectors')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('connectors')
export class ConnectorsController {
  constructor(private readonly connectors: ConnectorsService) {}

  // ─── LTI 1.3 ──────────────────────────────────────────────────────────────

  @Post('lti/launch')
  @Roles('ADMIN', 'INSTRUCTOR', 'STUDENT')
  ltiLaunch(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.connectors.handleLtiLaunch(tenantId, dto);
  }

  @Post('lti/grade')
  @Roles('ADMIN', 'INSTRUCTOR')
  ltiGrade(@Body() dto: { deploymentId: string; userId: string; score: number; maxScore: number; comment?: string }) {
    return this.connectors.sendLtiGrade(dto.deploymentId, dto.userId, dto.score, dto.maxScore, dto.comment);
  }

  // ─── OneRoster ─────────────────────────────────────────────────────────────

  @Post('oneroster/import')
  @Roles('ADMIN')
  oneRosterImport(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.connectors.importOneRoster(tenantId, dto);
  }

  @Get('oneroster/export')
  @Roles('ADMIN')
  oneRosterExport(@Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.connectors.exportOneRoster(tenantId);
  }

  // ─── QTI ───────────────────────────────────────────────────────────────────

  @Post('qti/import')
  @Roles('ADMIN', 'INSTRUCTOR')
  qtiImport(@Body() dto: { items: any[]; topicId: string }, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.connectors.importQtiItems(tenantId, dto.items, dto.topicId);
  }

  @Get('qti/export')
  @Roles('ADMIN', 'INSTRUCTOR')
  qtiExport(@Req() req: any, @Query('topicId') topicId?: string) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.connectors.exportQtiItems(tenantId, topicId);
  }

  // ─── Open Badges ───────────────────────────────────────────────────────────

  @Post('badges/issue/:certificationId')
  @Roles('ADMIN', 'INSTRUCTOR')
  issueBadge(@Param('certificationId') certId: string, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.connectors.issueOpenBadge(certId, tenantId);
  }
}
