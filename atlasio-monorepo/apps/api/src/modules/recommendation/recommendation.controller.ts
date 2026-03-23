import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { RecommendationService } from './recommendation.service';

@ApiTags('recommendations')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recs: RecommendationService) {}

  // ─── Student Self-Service ────────────────────────────────────────────────

  @Get('me/profile')
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  async myProfile(@Req() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.recs.computeStudentProfile(userId, tenantId);
  }

  @Get('me')
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  async myRecommendations(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user?.id ?? req.user?.userId;
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.recs.getUserRecommendations(userId, tenantId, limit ? parseInt(limit, 10) : 10);
  }

  // ─── Instructor: Student Profile ─────────────────────────────────────────

  @Get('students/:userId/profile')
  @Roles('INSTRUCTOR', 'ADMIN')
  async studentProfile(@Param('userId') userId: string, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.recs.computeStudentProfile(userId, tenantId);
  }

  @Post('students/:userId/compute')
  @Roles('INSTRUCTOR', 'ADMIN')
  async computeStudentProfile(@Param('userId') userId: string, @Req() req: any) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.recs.computeStudentProfile(userId, tenantId);
  }

  // ─── Instructor: Content Insights ────────────────────────────────────────

  @Get('content-insights')
  @Roles('INSTRUCTOR', 'ADMIN')
  async contentInsights(@Req() req: any, @Query('courseId') courseId?: string) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.recs.getContentInsights(tenantId, courseId);
  }

  // ─── Admin: At-Risk Students ─────────────────────────────────────────────

  @Get('at-risk')
  @Roles('ADMIN')
  async atRiskStudents(
    @Req() req: any,
    @Query('threshold') threshold?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
    return this.recs.getAtRiskStudents(
      tenantId,
      threshold ? parseInt(threshold, 10) : 70,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
