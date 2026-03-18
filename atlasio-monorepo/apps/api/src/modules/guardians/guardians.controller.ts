import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles';
import { GuardiansService } from './guardians.service';

@ApiTags('guardians')
@ApiBearerAuth('access-token')
@Controller('guardians')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class GuardiansController {
  constructor(private readonly service: GuardiansService) {}

  @Roles('GUARDIAN', 'ADMIN')
  @Post('link-student')
  linkStudent(@Body() dto: { studentEmail: string }, @Req() req: any) {
    const guardianId = req.user.id || req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId || 'public';
    return this.service.linkStudent(guardianId, dto.studentEmail, tenantId);
  }

  @Roles('GUARDIAN')
  @Get('my-students')
  getMyStudents(@Req() req: any) {
    const guardianId = req.user.id || req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId || 'public';
    return this.service.getMyStudentsOverview(guardianId, tenantId);
  }
}
