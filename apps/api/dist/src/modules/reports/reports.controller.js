"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const reports_service_1 = require("./reports.service");
const dto_1 = require("./dto");
const bypass_guard_1 = require("../auth/bypass.guard");
let ReportsController = class ReportsController {
    constructor(reports) {
        this.reports = reports;
    }
    async users(query, req, res) {
        const actorId = req.user.id ?? req.user.userId;
        const format = query.format ?? 'pdf';
        const report = await this.reports.usersReport(actorId, {
            role: query.role,
            from: query.from,
            to: query.to,
        });
        await this.reports.logDownload(actorId, report.reportNo, format);
        if (format === 'csv') {
            const csv = await this.reports.toCsv(report.rows);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${report.reportNo}.csv"`);
            return res.send(csv);
        }
        if (format === 'xlsx') {
            const buf = await this.reports.toXlsx(report.rows);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${report.reportNo}.xlsx"`);
            return res.send(Buffer.from(buf));
        }
        if (format === 'doc' || format === 'docx') {
            const doc = format === 'docx'
                ? await this.reports.toDocx('Kullanıcı Raporu', report, report.rows)
                : await this.reports.toDoc('Kullanıcı Raporu', report, report.rows);
            res.setHeader('Content-Type', this.reports.toContentType(format));
            res.setHeader('Content-Disposition', `attachment; filename="${report.reportNo}.${format}"`);
            return res.send(format === 'docx' ? Buffer.from(doc) : doc);
        }
        const pdf = await this.reports.toPdf('Kullanıcı Raporu', report, report.rows);
        res.setHeader('Content-Type', this.reports.toContentType(format));
        res.setHeader('Content-Disposition', `attachment; filename="${report.reportNo}.pdf"`);
        return res.send(pdf);
    }
    async usersInsights(query) {
        return this.reports.usersInsights({
            role: query.role,
            from: query.from,
            to: query.to,
        });
    }
    async coursesInsights() {
        return this.reports.coursesInsights();
    }
    async enrollmentsInsights() {
        return this.reports.enrollmentsInsights();
    }
    async streamInsights(tenantId) {
        return this.reports.streamInsights(tenantId ?? 'public');
    }
    async instructorPerformance(tenantId) {
        return this.reports.instructorPerformanceInsights(tenantId ?? 'public');
    }
    async requestExport(type) {
        return this.reports.requestAsyncExport(type, undefined);
    }
    async exportMeta(id) {
        const meta = await this.reports.getExportMeta(id);
        if (!meta)
            return { message: 'Not found' };
        return meta;
    }
    async exportDownload(id, res) {
        return this.reports.downloadExport(id, res);
    }
    listSchedules() {
        return this.reports.listSchedules();
    }
    createSchedule(dto, req) {
        return this.reports.createSchedule(dto, req.user.id ?? req.user.userId);
    }
    updateSchedule(id, dto, req) {
        return this.reports.updateSchedule(id, dto, req.user.id ?? req.user.userId);
    }
    dispatchDue(req) {
        return this.reports.dispatchDueSchedules(req.user.id ?? req.user.userId);
    }
    leaderboard(limit) {
        return this.reports.leaderboard(limit ? Number(limit) : 20);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(bypass_guard_1.BypassAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, swagger_1.ApiQuery)({ name: 'format', required: false, enum: dto_1.REPORT_FORMATS }),
    (0, swagger_1.ApiQuery)({ name: 'role', required: false, enum: ['ADMIN', 'INSTRUCTOR', 'STUDENT'] }),
    (0, swagger_1.ApiQuery)({ name: 'from', required: false, description: 'ISO date (e.g. 2026-02-01)' }),
    (0, swagger_1.ApiQuery)({ name: 'to', required: false, description: 'ISO date (e.g. 2026-02-14)' }),
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.UsersReportQueryDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "users", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(bypass_guard_1.BypassAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, swagger_1.ApiQuery)({ name: 'role', required: false, enum: ['ADMIN', 'INSTRUCTOR', 'STUDENT'] }),
    (0, swagger_1.ApiQuery)({ name: 'from', required: false, description: 'ISO date (e.g. 2026-02-01)' }),
    (0, swagger_1.ApiQuery)({ name: 'to', required: false, description: 'ISO date (e.g. 2026-02-14)' }),
    (0, common_1.Get)('users/insights'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.UsersReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "usersInsights", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(bypass_guard_1.BypassAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Get)('courses/insights'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "coursesInsights", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(bypass_guard_1.BypassAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Get)('enrollments/insights'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "enrollmentsInsights", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(bypass_guard_1.BypassAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Get)('stream/insights'),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "streamInsights", null);
__decorate([
    (0, common_1.Get)('instructors/insights'),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "instructorPerformance", null);
__decorate([
    (0, common_1.Post)('exports/:type/request'),
    __param(0, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "requestExport", null);
__decorate([
    (0, common_1.Get)('exports/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportMeta", null);
__decorate([
    (0, common_1.Get)('exports/:id/download'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportDownload", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Get)('schedules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "listSchedules", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Post)('schedules'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateScheduledReportDto, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "createSchedule", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Patch)('schedules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateScheduledReportDto, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "updateSchedule", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Post)('schedules/dispatch-due'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "dispatchDue", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Max entries (default 20, max 100)' }),
    (0, common_1.Get)('leaderboard'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "leaderboard", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiTags)('reports'),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map