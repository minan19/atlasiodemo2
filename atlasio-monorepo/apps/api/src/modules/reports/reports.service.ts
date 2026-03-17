import { Inject, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type Redis from 'ioredis';
import { REDIS } from '../../infra/redis/redis.provider';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { DocumentsService } from '../documents/documents.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateScheduledReportDto,
  ReportFormat,
  ScheduleFrequency,
  UpdateScheduledReportDto,
} from './dto';
import * as fs from 'fs';
import * as path from 'path';

type UserReportFilters = {
  from?: string;
  to?: string;
  role?: string;
};

const reportFormatMap: Record<ReportFormat, 'PDF' | 'CSV' | 'XLSX' | 'DOC'> = {
  pdf: 'PDF',
  csv: 'CSV',
  xlsx: 'XLSX',
  doc: 'DOC',
  docx: 'DOC',
};

function parseMaybeDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toNextRunAt(
  frequency: ScheduleFrequency,
  hour: number,
  minute: number,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  now = new Date(),
): Date {
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setHours(hour, minute, 0, 0);

  if (frequency === 'WEEKLY') {
    const weekday = dayOfWeek ?? 1;
    const delta = (weekday - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + delta);
    if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
    return candidate;
  }

  const monthDay = Math.min(Math.max(dayOfMonth ?? 1, 1), 28);
  candidate.setDate(monthDay);
  if (candidate <= now) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly docs: DocumentsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private cacheTtlMs = Number(process.env.REPORTS_INSIGHTS_TTL_MS ?? 300_000); // 5dk

  /**
   * Sektör profiline göre ek uyarı/öncelik notları.
   * Enerji → fiyat volatilitesi, Finans → likidite/faiz,
   * Üretim → talep/stok, Tarım → mevsimsellik.
   */
  private sectorAdvice(sector?: 'ENERGY' | 'FINANCE' | 'MANUFACTURING' | 'AGRI'): string[] {
    switch (sector) {
      case 'ENERGY':
        return ['Enerji: fiyat volatilitesini ve hedge oranını takip et; kısa/uzun kontrat dengesini kontrol et.'];
      case 'FINANCE':
        return ['Finans: likidite (LCR) ve faiz/kur duyarlılığını senaryo testlerine ekle; nakit akış tamponu oluştur.'];
      case 'MANUFACTURING':
        return ['Üretim: talep tahmini + stok devir hızını izleyip güvenlik stoklarını güncelle; tedarik lead time riskini hesapla.'];
      case 'AGRI':
        return ['Tarım: mevsimsel risk (hava/hasat) için tampon kapasite ve sigorta kurgula; üretim/piyasa fiyat senaryosu çalış.'];
      default:
        return [];
    }
  }

  private async getCache(key: string) {
    try {
      const raw = await this.redis.get(`reports:${key}`);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  }

  private async setCache(key: string, value: unknown) {
    if (this.cacheTtlMs <= 0) return;
    const ttlS = Math.ceil(this.cacheTtlMs / 1000);
    try {
      await this.redis.set(`reports:${key}`, JSON.stringify(value), 'EX', ttlS);
    } catch {
      /* Redis hataları raporu engellemesin */
    }
  }

  async usersReport(actorId?: string, filters?: UserReportFilters) {
    const fromDate = parseMaybeDate(filters?.from);
    const toDate = parseMaybeDate(filters?.to);
    const roleFilter = filters?.role?.toUpperCase();
    const allowedRoles: readonly Role[] = ['ADMIN', 'INSTRUCTOR', 'STUDENT'];

    const where: Prisma.UserWhereInput = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }
    const normalizedRole = allowedRoles.find((role) => role === roleFilter);
    if (normalizedRole) {
      where.role = normalizedRole;
    }

    const rows = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const reportNo = await this.docs.nextDocNo('RP');
    return { reportNo, generatedAt: new Date().toISOString(), rows };
  }

  /**
   * Grafik/analiz için özet veri: rol kırılımı, aktif/pasif, günlük kayıt sayısı ve basit öneriler.
   */
  async usersInsights(filters?: UserReportFilters) {
    const cacheKey = `usersInsights:${JSON.stringify(filters ?? {})}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const { rows } = await this.usersReport(undefined, filters);

    const roleCounts: Record<string, number> = {};
    const activeCounts: Record<'active' | 'inactive', number> = { active: 0, inactive: 0 };
    const perDay: Record<string, number> = {};

    for (const u of rows) {
      roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1;
      activeCounts[u.isActive ? 'active' : 'inactive'] += 1;
      const day = (u.createdAt instanceof Date ? u.createdAt : new Date(String(u.createdAt))).toISOString().slice(0, 10);
      perDay[day] = (perDay[day] ?? 0) + 1;
    }

    const topRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const signupPeak = Object.entries(perDay).sort((a, b) => b[1] - a[1])[0];

    const suggestions: string[] = [];
    if (activeCounts.inactive > 0) {
      suggestions.push(
        `Pasif kullanıcı sayısı ${activeCounts.inactive}; yeniden aktivasyon kampanyası önerilir.`,
      );
    }
    if (topRole === 'STUDENT') {
      suggestions.push('Öğrenci ağırlıklı kitle; eğitmen kazanımı için hedefli onboarding eklenebilir.');
    }
    if (signupPeak && signupPeak[1] > 5) {
      suggestions.push(`En yüksek kayıt günü ${signupPeak[0]} (${signupPeak[1]} kayıt); o günkü pazarlama aksiyonunu tekrar dene.`);
    }

    const result = {
      generatedAt: new Date().toISOString(),
      roleCounts,
      activeCounts,
      signupsByDay: perDay,
      charts: {
        rolePie: {
          labels: Object.keys(roleCounts),
          data: Object.values(roleCounts),
        },
        activeBar: {
          labels: ['Active', 'Inactive'],
          data: [activeCounts.active, activeCounts.inactive],
        },
        signupsLine: {
          labels: Object.keys(perDay).sort(),
          data: Object.keys(perDay)
            .sort()
            .map((d) => perDay[d]),
        },
      },
      suggestions,
    };
    await this.setCache(cacheKey, result);
    return result;
  }

  async coursesInsights(sector?: 'ENERGY' | 'FINANCE' | 'MANUFACTURING' | 'AGRI') {
    const cacheKey = 'coursesInsights';
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const courses = await this.prisma.course.findMany({
      select: {
        id: true,
        title: true,
        isPublished: true,
        price: true,
        createdAt: true,
        _count: { select: { Enrollment: true } },
      },
    });
    const total = courses.length;
    const published = courses.filter((c: any) => c.isPublished).length;
    const enrollmentsByCourse = courses
      .map((c: any) => ({ id: c.id, title: c.title, count: c._count.Enrollment }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);
    const revenueEstimate = courses.reduce(
      (sum: number, c: any) => sum + Number(c.price ?? 0) * c._count.Enrollment,
      0,
    );

    const suggestions: string[] = [];
    if (published < total) suggestions.push(`Yayınlanmamış ${total - published} kurs var; hızlı yayınla.`);
    if (enrollmentsByCourse[0]?.count === 0) suggestions.push('Hiç kayıt olmayan kurslar var; içerik/görünürlük kontrolü yap.');
    if (revenueEstimate === 0) suggestions.push('Gelir tahmini 0; fiyatlandırma veya ödeme akışını gözden geçir.');
    suggestions.push(...this.sectorAdvice(sector));

    const result = {
      generatedAt: new Date().toISOString(),
      totalCourses: total,
      published,
      revenueEstimate,
      topCourses: enrollmentsByCourse,
      charts: {
        publishPie: {
          labels: ['Published', 'Draft'],
          data: [published, total - published],
        },
        topCoursesBar: {
          labels: enrollmentsByCourse.map((c: any) => c.title || c.id),
          data: enrollmentsByCourse.map((c: any) => c.count),
        },
      },
      suggestions,
    };
    await this.setCache(cacheKey, result);
    return result;
  }

  async enrollmentsInsights(sector?: 'ENERGY' | 'FINANCE' | 'MANUFACTURING' | 'AGRI') {
    const cacheKey = 'enrollmentsInsights';
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const enrollments = await this.prisma.enrollment.findMany({
      select: { courseId: true, createdAt: true, Course: { select: { title: true, price: true } } },
    });

    const perDay: Record<string, number> = {};
    const perCourse: Record<string, { title?: string; count: number; revenue: number }> = {};
    for (const e of enrollments) {
      const day = (e.createdAt instanceof Date ? e.createdAt : new Date(String(e.createdAt))).toISOString().slice(0, 10);
      perDay[day] = (perDay[day] ?? 0) + 1;
      const key = e.courseId;
      const price = Number(e.Course?.price ?? 0);
      if (!perCourse[key]) perCourse[key] = { title: e.Course?.title ?? undefined, count: 0, revenue: 0 };
      perCourse[key].count += 1;
      perCourse[key].revenue += price;
    }

    const topCourses = Object.entries(perCourse)
      .map(([id, v]) => ({ id, title: v.title, count: v.count, revenue: v.revenue }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    const signupsLineLabels = Object.keys(perDay).sort();
    const signupsLineData = signupsLineLabels.map((d) => perDay[d]);

    const suggestions: string[] = [];
    if (signupsLineData.reduce((a, b) => a + b, 0) === 0) {
      suggestions.push('Hiç kayıt yok; ödeme/checkout akışını doğrula.');
    }
    if (topCourses[0]?.count && topCourses[0].count > 5 * (topCourses[1]?.count ?? 0)) {
      suggestions.push('Kayıtlar tek kursa yoğunlaşmış; katalog çeşitliliğini artır.');
    }
    suggestions.push(...this.sectorAdvice(sector));

    const result = {
      generatedAt: new Date().toISOString(),
      totalEnrollments: enrollments.length,
      signupsByDay: perDay,
      topCourses,
      charts: {
        signupsLine: { labels: signupsLineLabels, data: signupsLineData },
        topCoursesBar: { labels: topCourses.map((c: any) => c.title ?? c.id), data: topCourses.map((c: any) => c.count) },
        topRevenueBar: { labels: topCourses.map((c: any) => c.title ?? c.id), data: topCourses.map((c: any) => c.revenue) },
      },
      suggestions,
    };
    await this.setCache(cacheKey, result);
    return result;
  }

  // Streaming/Live telemetry özetleri (StreamMetric)
  async streamInsights(tenantId = 'public', sector?: 'ENERGY' | 'FINANCE' | 'MANUFACTURING' | 'AGRI') {
    const cacheKey = `streamInsights:${tenantId}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const [agg, topCourses] = await this.prisma.$transaction([
      this.prisma.streamMetric.aggregate({
        where: { tenantId },
        _sum: { watchSeconds: true, rebufferCount: true, avgBitrateKbps: true },
        _count: true,
      }),
      this.prisma.streamMetric.groupBy({
        by: ['courseId'],
        where: { tenantId },
        _sum: { watchSeconds: true },
        _avg: { avgBitrateKbps: true },
        _count: { _all: true },
        orderBy: { _sum: { watchSeconds: 'desc' } },
        take: 5,
      }),
    ]);

    const totalWatch = agg._sum.watchSeconds ?? 0;
    const avgBitrate =
      agg._count > 0 && agg._sum.avgBitrateKbps
        ? Math.round((agg._sum.avgBitrateKbps as number) / agg._count)
        : 0;

    const result = {
      generatedAt: new Date().toISOString(),
      totalRecords: agg._count,
      totalWatchSeconds: totalWatch,
      totalRebuffers: agg._sum.rebufferCount ?? 0,
      avgBitrateKbps: avgBitrate,
      topCourses: topCourses.map((c: any) => ({
        courseId: c.courseId,
        watchSeconds: c._sum?.watchSeconds ?? 0,
        avgBitrateKbps: c._avg?.avgBitrateKbps ? Math.round(c._avg.avgBitrateKbps) : null,
        hits:
          typeof c._count === 'object' && (c._count as any)?._all
            ? (c._count as any)._all
            : 0,
      })),
      charts: {
        topCoursesBar: {
          labels: topCourses.map((c: any) => c.courseId ?? 'unknown'),
          data: topCourses.map((c: any) => c._sum?.watchSeconds ?? 0),
        },
      },
      suggestions: this.sectorAdvice(sector),
    };

    await this.setCache(cacheKey, result);
    return result;
  }

  async instructorPerformanceInsights(tenantId = 'public', sector?: 'ENERGY' | 'FINANCE' | 'MANUFACTURING' | 'AGRI') {
    const cacheKey = `instructorPerformance:${tenantId}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Enrollments üzerinden eğitmen performansı (gelir tahmini + kayıt)
    const enrollments = await this.prisma.enrollment.findMany({
      where: { tenantId },
      select: {
        courseId: true,
        Course: { select: { instructorId: true, title: true, price: true } },
      },
    });

    const instructorMap: Record<
      string,
      { revenue: number; enrollments: number; courses: Set<string> }
    > = {};

    for (const e of enrollments) {
      const instructorId = (e as any).Course?.instructorId ?? 'unknown';
      const price = Number((e as any).Course?.price ?? 0);
      if (!instructorMap[instructorId]) {
        instructorMap[instructorId] = { revenue: 0, enrollments: 0, courses: new Set() };
      }
      instructorMap[instructorId].revenue += price;
      instructorMap[instructorId].enrollments += 1;
      if (e.courseId) instructorMap[instructorId].courses.add(e.courseId);
    }

    const leaderboard = Object.entries(instructorMap)
      .map(([id, v]) => ({
        instructorId: id,
        revenue: Math.round(v.revenue),
        enrollments: v.enrollments,
        courseCount: v.courses.size,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue || b.enrollments - a.enrollments)
      .slice(0, 5);

    const result = {
      generatedAt: new Date().toISOString(),
      totalInstructors: Object.keys(instructorMap).length,
      totalEnrollments: enrollments.length,
      revenueEstimate: leaderboard.reduce((s, i) => s + i.revenue, 0),
      topInstructors: leaderboard,
      charts: {
        revenueBar: {
          labels: leaderboard.map((i) => i.instructorId),
          data: leaderboard.map((i) => i.revenue),
        },
        enrollmentsBar: {
          labels: leaderboard.map((i) => i.instructorId),
          data: leaderboard.map((i) => i.enrollments),
        },
      },
      suggestions: [
        ...(leaderboard.length === 0 ? ['Henüz kayıt yok.'] : []),
        ...this.sectorAdvice(sector),
      ],
    };

    await this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Büyük dataset exportları için async kuyruk (stub): isteği kaydedip uuid döner.
   * Şimdilik anında CSV üretip /tmp altına yazar, status=COMPLETED döner.
   */
  async requestAsyncExport(type: 'USERS' | 'COURSES' | 'ENROLLMENTS', actorId?: string) {
    const id = `exp_${Date.now()}`;
    const exportPath = path.join('/tmp', `atlasio-${id}.csv`);

    const data = await this.generateExportData(type);
    const csv = await this.toCsv(data);
    fs.writeFileSync(exportPath, csv, 'utf8');

    // Kaydı DB'ye yaz
    await this.prisma.asyncExport.create({
      data: { id, type, status: 'COMPLETED', filePath: exportPath, actorId: actorId ?? null },
    });

    await this.audit.log({
      actorId,
      action: 'export.completed',
      entity: 'AsyncExport',
      entityId: id,
      meta: { type, filePath: exportPath },
    });

    return { requestId: id, status: 'COMPLETED', downloadUrl: `/reports/exports/${id}/download` };
  }

  async getExportMeta(id: string) {
    const rec = await this.prisma.asyncExport.findUnique({ where: { id } });
    if (!rec) return null;
    return { id: rec.id, type: rec.type, status: rec.status, downloadUrl: rec.filePath ? `/reports/exports/${rec.id}/download` : null };
  }

  async downloadExport(id: string, res: any) {
    const rec = await this.prisma.asyncExport.findUnique({ where: { id } });
    if (!rec || rec.status !== 'COMPLETED' || !rec.filePath || !fs.existsSync(rec.filePath)) {
      res.status(404).send({ message: 'Export not found' });
      return;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=\"${rec.id}.csv\"`);
    return fs.createReadStream(rec.filePath).pipe(res);
  }

  private async generateExportData(type: 'USERS' | 'COURSES' | 'ENROLLMENTS') {
    if (type === 'USERS') {
      return this.prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      });
    }
    if (type === 'COURSES') {
      return this.prisma.course.findMany({
        select: { id: true, title: true, isPublished: true, price: true, instructorId: true, createdAt: true },
      });
    }
    return this.prisma.enrollment.findMany({
      select: { id: true, userId: true, courseId: true, createdAt: true, tenantId: true },
    });
  }

  async toCsv(data: Record<string, unknown>[]) {
    const headers = Object.keys(data[0] || {});
    const lines = [headers.join(',')];
    for (const row of data) {
      lines.push(
        headers
          .map((h) => JSON.stringify((row[h] ?? '') as string))
          .join(','),
      );
    }
    return lines.join('\n');
  }

  async toXlsx(data: any[]) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Report');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map((k) => ({ header: k, key: k, width: 24 }));
      ws.addRows(data);
    }
    return wb.xlsx.writeBuffer();
  }

  async toDoc(title: string, meta: { reportNo: string; generatedAt: string }, data: any[]) {
    const lines = [
      '{\\rtf1\\ansi\\deff0',
      '{\\fonttbl{\\f0 Arial;}}',
      '\\f0\\fs24',
      `\\b ${title}\\b0\\line`,
      `Rapor No: ${meta.reportNo}\\line`,
      `Tarih/Saat: ${meta.generatedAt}\\line\\line`,
      'Veriler:\\line',
      ...data.slice(0, 300).map((row) => JSON.stringify(row).replace(/[{}\\]/g, '')),
      '}',
    ];
    return lines.join('\\line');
  }

  async toDocx(title: string, meta: { reportNo: string; generatedAt: string }, data: any[]) {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 32 })] }),
            new Paragraph({ children: [new TextRun(`Rapor No: ${meta.reportNo}`)] }),
            new Paragraph({ children: [new TextRun(`Tarih/Saat: ${meta.generatedAt}`)] }),
            new Paragraph({ text: '' }),
            ...data.slice(0, 300).map(
              (row) =>
                new Paragraph({
                  children: [new TextRun({ text: JSON.stringify(row), size: 20 })],
                }),
            ),
          ],
        },
      ],
    });
    return Packer.toBuffer(doc);
  }

  async toPdf(title: string, meta: { reportNo: string; generatedAt: string }, data: any[]) {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    doc.fontSize(16).text(title, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Rapor No: ${meta.reportNo}`);
    doc.text(`Tarih/Saat: ${meta.generatedAt}`);
    doc.moveDown();

    doc.fontSize(11).text('Veriler:', { underline: true });
    doc.moveDown(0.5);

    for (const row of data.slice(0, 200)) {
      doc.fontSize(9).text(JSON.stringify(row));
    }
    doc.end();
    return done;
  }

  async logDownload(actorId: string | undefined, reportNo: string, format: string) {
    await this.audit.log({
      actorId,
      action: 'report.download',
      entity: 'Report',
      entityId: reportNo,
      meta: { format },
    });
  }

  async createSchedule(dto: CreateScheduledReportDto, actorId: string) {    const nextRunAt = toNextRunAt(dto.frequency, dto.hour, dto.minute, dto.dayOfWeek, dto.dayOfMonth);
    const schedule = await this.prisma.scheduledReport.create({
      data: {
        name: dto.name,
        reportType: 'USERS',
        format: reportFormatMap[dto.format],
        filters: { role: dto.role, from: dto.from, to: dto.to },
        recipients: dto.recipients,
        frequency: dto.frequency,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        hour: dto.hour,
        minute: dto.minute,
        nextRunAt,
        createdById: actorId,
      },
    });

    await this.audit.log({
      actorId,
      action: 'report.schedule.create',
      entity: 'ScheduledReport',
      entityId: schedule.id,
      meta: { name: schedule.name, nextRunAt: schedule.nextRunAt },
    });
    return schedule;
  }

  listSchedules() {    return this.prisma.scheduledReport.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSchedule(id: string, dto: UpdateScheduledReportDto, actorId: string) {    const existing = await this.prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) return null;

    const frequency = dto.frequency ?? (existing.frequency as ScheduleFrequency);
    const hour = dto.hour ?? existing.hour;
    const minute = dto.minute ?? existing.minute;
    const dayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const dayOfMonth = dto.dayOfMonth ?? existing.dayOfMonth;
    const shouldRecompute =
      dto.frequency !== undefined ||
      dto.hour !== undefined ||
      dto.minute !== undefined ||
      dto.dayOfWeek !== undefined ||
      dto.dayOfMonth !== undefined;

    const updated = await this.prisma.scheduledReport.update({
      where: { id },
      data: {
        name: dto.name,
        format: dto.format ? reportFormatMap[dto.format] : undefined,
        filters: dto.role || dto.from || dto.to ? { role: dto.role, from: dto.from, to: dto.to } : undefined,
        recipients: dto.recipients,
        frequency,
        dayOfWeek,
        dayOfMonth,
        hour,
        minute,
        isActive: dto.isActive,
        nextRunAt: shouldRecompute ? toNextRunAt(frequency, hour, minute, dayOfWeek, dayOfMonth) : undefined,
      },
    });

    await this.audit.log({
      actorId,
      action: 'report.schedule.update',
      entity: 'ScheduledReport',
      entityId: updated.id,
      meta: { nextRunAt: updated.nextRunAt, isActive: updated.isActive },
    });
    return updated;
  }

  async dispatchDueSchedules(actorId?: string) {    const now = new Date();
    const dueSchedules = await this.prisma.scheduledReport.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: 'asc' },
      take: 20,
    });

    const dispatched: string[] = [];
    for (const schedule of dueSchedules) {
      await this.dispatchSchedule(schedule, actorId);
      dispatched.push(schedule.id);
    }
    return { processed: dispatched.length, scheduleIds: dispatched };
  }

  private async dispatchSchedule(schedule: any, actorId?: string) {
    const filters = (schedule.filters as Record<string, string | undefined> | null) ?? undefined;
    const report = await this.usersReport(actorId, filters);
    const format = String(schedule.format).toLowerCase() as ReportFormat;
    const attachment = await this.exportUsersReport(report, format);

    const mailResult = await this.notifications.sendScheduledReport({
      recipients: schedule.recipients ?? [],
      subject: `Atlasio Report ${report.reportNo}`,
      body: `Scheduled report is attached.\nReport No: ${report.reportNo}\nGenerated At: ${report.generatedAt}`,
      attachment,
    });

    await this.audit.log({
      actorId: actorId ?? schedule.createdById,
      action: mailResult.sent ? 'report.schedule.dispatch' : 'report.schedule.dispatch.skipped',
      entity: 'ScheduledReport',
      entityId: schedule.id,
      meta: {
        reportNo: report.reportNo,
        format: schedule.format,
        recipients: schedule.recipients,
        mailResult,
      },
    });

    const nextRunAt = toNextRunAt(
      schedule.frequency as ScheduleFrequency,
      schedule.hour,
      schedule.minute,
      schedule.dayOfWeek,
      schedule.dayOfMonth,
    );    await this.prisma.scheduledReport.update({
      where: { id: schedule.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
      },
    });
  }

  toContentType(format: ReportFormat) {
    if (format === 'csv') return 'text/csv';
    if (format === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (format === 'doc') return 'application/msword';
    if (format === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'application/pdf';
  }

  private async exportUsersReport(
    report: { reportNo: string; generatedAt: string; rows: any[] },
    format: ReportFormat,
  ) {
    if (format === 'csv') {
      return {
        filename: `${report.reportNo}.csv`,
        contentType: this.toContentType(format),
        content: await this.toCsv(report.rows),
      };
    }

    if (format === 'xlsx') {
      return {
        filename: `${report.reportNo}.xlsx`,
        contentType: this.toContentType(format),
        content: Buffer.from(await this.toXlsx(report.rows)),
      };
    }

    if (format === 'doc') {
      return {
        filename: `${report.reportNo}.doc`,
        contentType: this.toContentType(format),
        content: await this.toDoc('Kullanıcı Raporu', report, report.rows),
      };
    }

    if (format === 'docx') {
      return {
        filename: `${report.reportNo}.docx`,
        contentType: this.toContentType(format),
        content: Buffer.from(await this.toDocx('Kullanıcı Raporu', report, report.rows)),
      };
    }

    return {
      filename: `${report.reportNo}.pdf`,
      contentType: this.toContentType('pdf'),
      content: await this.toPdf('Kullanıcı Raporu', report, report.rows),
    };
  }

  async leaderboard(limit = 20) {
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const [quizGroups, completedGroups] = await Promise.all([
      this.prisma.quizAttempt.groupBy({
        by: ['userId'],
        where: { correct: true, userId: { not: null } },
        _count: { id: true },
      }),
      this.prisma.enrollment.groupBy({
        by: ['userId'],
        where: { completedAt: { not: null } },
        _count: { id: true },
      }),
    ]);

    const scoreMap = new Map<string, number>();
    for (const row of quizGroups) {
      if (!row.userId) continue;
      scoreMap.set(row.userId, (scoreMap.get(row.userId) ?? 0) + row._count.id);
    }
    for (const row of completedGroups) {
      scoreMap.set(row.userId, (scoreMap.get(row.userId) ?? 0) + row._count.id * 10);
    }

    const sorted = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, safeLimit);

    const userIds = sorted.map(([id]) => id);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const badgeFor = (rank: number) => {
      if (rank === 1) return 'Altın';
      if (rank === 2) return 'Gümüş';
      if (rank === 3) return 'Bronz';
      return 'Yıldırım';
    };
    const frameFor = (rank: number) => {
      if (rank === 1) return 'gold';
      if (rank === 2) return 'silver';
      if (rank === 3) return 'bronze';
      return 'default';
    };

    return sorted.map(([userId, score], idx) => {
      const u = userMap.get(userId);
      return {
        rank: idx + 1,
        userId,
        name: u?.name ?? u?.email ?? userId,
        score,
        badge: badgeFor(idx + 1),
        frame: frameFor(idx + 1),
      };
    });
  }
}
