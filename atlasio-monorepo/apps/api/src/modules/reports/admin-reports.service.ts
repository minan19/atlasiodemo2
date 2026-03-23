import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async finance() {
    const payouts = await this.prisma.instructorPayment.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
    const revenues = await this.prisma.paymentIntent.aggregate({ _sum: { amount: true } });
    return {
      revenueTotal: revenues._sum.amount ?? 0,
      payouts,
    };
  }

  async intel() {
    const attendance = await this.prisma.attendance.count({});
    const sessionsLive = await this.prisma.liveSession.count({ where: { status: 'RUNNING' } });
    const risky = await this.prisma.aiProctoringResult.findMany({ take: 20, orderBy: { createdAt: 'desc' } }).catch(() => []);
    return { attendance, sessionsLive, risky: risky ?? [] };
  }

  async salesAi() {
    // placeholder: simple heuristic
    const topCourses = await this.prisma.course.findMany({ take: 5, orderBy: { Enrollment: { _count: 'desc' } }, include: { Enrollment: true } }).catch(() => []);
    return {
      recommendation: "Yoğun talep gören kurslara %10 bundle indirimi ve 7 günlük ücretsiz deneme önerisi.",
      topCourses,
    };
  }

  /**
   * Dashboard KPI endpoint: tüm kritik metrikler tek istekte.
   */
  async kpi() {
    const [
      activeUsers,
      liveSessions,
      pendingCourses,
      revenueAgg,
      totalEnrollments,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.liveSession.count({ where: { status: 'RUNNING' } }),
      this.prisma.course.count({ where: { isPublished: false } }),
      this.prisma.paymentIntent.aggregate({
        _sum: { amount: true },
        where: {
          status: 'SUCCEEDED',
          paidAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.enrollment.count(),
    ]);

    const monthlyRevenue = revenueAgg._sum.amount ?? 0;

    return {
      activeUsers,
      liveSessions,
      pendingCourses,
      monthlyRevenue,
      totalEnrollments,
    };
  }

  /**
   * Tenant listesi + temel metrikler.
   */
  async tenants() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        _count: {
          select: {
            Enrollment: true,
            Course: true,
          },
        },
      },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.domain ?? null,
      status: t.status,
      enrollments: t._count.Enrollment,
      courses: t._count.Course,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  /**
   * Sistem sağlık durumu (DB ping + uptime).
   */
  async systemHealth() {
    const startAt = Date.now();
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch { /* noop */ }
    const dbLatencyMs = Date.now() - startAt;

    const uptimeSec = Math.floor(process.uptime());

    return [
      {
        name: 'Web API',
        status: 'Sağlıklı',
        detail: `Uptime: ${Math.floor(uptimeSec / 3600)}s ${Math.floor((uptimeSec % 3600) / 60)}m`,
      },
      {
        name: 'Veritabanı',
        status: dbOk ? 'Sağlıklı' : 'Hata',
        detail: dbOk ? `Gecikme: ${dbLatencyMs}ms` : 'Bağlantı kurulamadı',
      },
      {
        name: 'Bildirim Servisi',
        status: process.env.SMTP_HOST ? 'Sağlıklı' : 'Uyarı',
        detail: process.env.SMTP_HOST ? 'SMTP hazır' : 'SMTP yapılandırılmamış',
      },
      {
        name: 'Ödeme Sağlayıcısı',
        status: (process.env.IYZICO_API_KEY || process.env.STRIPE_SECRET_KEY) ? 'Sağlıklı' : 'Uyarı',
        detail: process.env.IYZICO_API_KEY ? 'iyzico aktif' : process.env.STRIPE_SECRET_KEY ? 'Stripe aktif' : 'Demo mod',
      },
    ];
  }
}
