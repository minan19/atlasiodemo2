import { Controller, Get, Param, Post, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('enrollments')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Post('courses/:courseId/enroll')
  enroll(@Param('courseId') courseId: string, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.enrollments.enroll(req.user.id ?? req.user.userId, courseId, tenantId);
  }

  @Get('me/enrollments')
  my(@Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.enrollments.myEnrollments(req.user.id ?? req.user.userId, tenantId);
  }

  @Get('me/history')
  myHistory(@Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.enrollments.myHistory(req.user.id ?? req.user.userId, tenantId);
  }

  @Get('me/schedule')
  mySchedule(@Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.enrollments.mySchedule(req.user.id ?? req.user.userId, tenantId);
  }

  @Patch('enrollments/:id/complete')
  @Roles('ADMIN', 'INSTRUCTOR')
  complete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.enrollments.markComplete(
      id,
      req.user.id ?? req.user.userId,
      req.user.role ?? req.user.roles?.[0],
      tenantId,
    );
  }

  @Patch('enrollments/:id/refund')
  @Roles('ADMIN')
  refund(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.enrollments.markRefund(
      id,
      req.user.id ?? req.user.userId,
      req.user.role ?? req.user.roles?.[0],
      tenantId,
    );
  }
}
