import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { ReportsService } from './reports.service';
import type { Response } from 'express';
import { CreateScheduledReportDto, REPORT_FORMATS, UsersReportQueryDto, UpdateScheduledReportDto } from './dto';
import { BypassAuthGuard } from '../auth/bypass.guard';

@ApiBearerAuth('access-token')
@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(BypassAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiQuery({ name: 'format', required: false, enum: REPORT_FORMATS })
  @ApiQuery({ name: 'role', required: false, enum: ['ADMIN', 'INSTRUCTOR', 'STUDENT'] })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date (e.g. 2026-02-01)' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date (e.g. 2026-02-14)' })
  @Get('users')
  async users(@Query() query: UsersReportQueryDto, @Req() req: any, @Res() res: Response) {
    const actorId = req.user.id ?? req.user.userId;
    const format = query.format ?? 'pdf';
    const report = await this.reports.usersReport(actorId, {
      role: query.role,
      from: query.from,
      to: query.to,
    });
    await this.reports.logDownload(actorId, report.reportNo, format);

    if (format === 'csv') {
      const csv = await this.reports.toCsv(report.rows as any[]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report.reportNo}.csv"`);
      return res.send(csv);
    }

    if (format === 'xlsx') {
      const buf = await this.reports.toXlsx(report.rows as any[]);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${report.reportNo}.xlsx"`);
      return res.send(Buffer.from(buf));
    }

    if (format === 'doc' || format === 'docx') {
      const doc =
        format === 'docx'
          ? await this.reports.toDocx('Kullanıcı Raporu', report as any, report.rows as any[])
          : await this.reports.toDoc('Kullanıcı Raporu', report as any, report.rows as any[]);
      res.setHeader('Content-Type', this.reports.toContentType(format));
      res.setHeader('Content-Disposition', `attachment; filename="${report.reportNo}.${format}"`);
      return res.send(format === 'docx' ? Buffer.from(doc) : doc);
    }

    const pdf = await this.reports.toPdf('Kullanıcı Raporu', report as any, report.rows as any[]);
    res.setHeader('Content-Type', this.reports.toContentType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportNo}.pdf"`);
    return res.send(pdf);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(BypassAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiQuery({ name: 'role', required: false, enum: ['ADMIN', 'INSTRUCTOR', 'STUDENT'] })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date (e.g. 2026-02-01)' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date (e.g. 2026-02-14)' })
  @Get('users/insights')
  async usersInsights(@Query() query: UsersReportQueryDto) {
    return this.reports.usersInsights({
      role: query.role,
      from: query.from,
      to: query.to,
    });
  }

  @ApiBearerAuth('access-token')
  @UseGuards(BypassAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('courses/insights')
  async coursesInsights() {
    return this.reports.coursesInsights();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(BypassAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('enrollments/insights')
  async enrollmentsInsights() {
    return this.reports.enrollmentsInsights();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(BypassAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('stream/insights')
  async streamInsights(@Query('tenantId') tenantId?: string) {
    return this.reports.streamInsights(tenantId ?? 'public');
  }

  // Eğitmen performansı (gelir + kayıt)
  @Get('instructors/insights')
  async instructorPerformance(@Query('tenantId') tenantId?: string) {
    return this.reports.instructorPerformanceInsights(tenantId ?? 'public');
  }

  // Büyük export isteği (asenkron) - test için auth yok; prod'da guard ekleyin.
  @Post('exports/:type/request')
  async requestExport(@Param('type') type: 'USERS' | 'COURSES' | 'ENROLLMENTS') {
    return this.reports.requestAsyncExport(type, undefined);
  }

  @Get('exports/:id')
  async exportMeta(@Param('id') id: string) {
    const meta = await this.reports.getExportMeta(id);
    if (!meta) return { message: 'Not found' };
    return meta;
  }

  @Get('exports/:id/download')
  async exportDownload(@Param('id') id: string, @Res() res: Response) {
    return this.reports.downloadExport(id, res);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('schedules')
  listSchedules() {
    return this.reports.listSchedules();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('schedules')
  createSchedule(@Body() dto: CreateScheduledReportDto, @Req() req: any) {
    return this.reports.createSchedule(dto, req.user.id ?? req.user.userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch('schedules/:id')
  updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduledReportDto, @Req() req: any) {
    return this.reports.updateSchedule(id, dto, req.user.id ?? req.user.userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('schedules/dispatch-due')
  dispatchDue(@Req() req: any) {
    return this.reports.dispatchDueSchedules(req.user.id ?? req.user.userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiQuery({ name: 'limit', required: false, description: 'Max entries (default 20, max 100)' })
  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    return this.reports.leaderboard(limit ? Number(limit) : 20);
  }
}
