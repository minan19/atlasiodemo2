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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminReportsService = class AdminReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
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
        const topCourses = await this.prisma.course.findMany({ take: 5, orderBy: { Enrollment: { _count: 'desc' } }, include: { Enrollment: true } }).catch(() => []);
        return {
            recommendation: "Yoğun talep gören kurslara %10 bundle indirimi ve 7 günlük ücretsiz deneme önerisi.",
            topCourses,
        };
    }
    async kpi() {
        const [activeUsers, liveSessions, pendingCourses, revenueAgg, totalEnrollments,] = await Promise.all([
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
    async systemHealth() {
        const startAt = Date.now();
        let dbOk = false;
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            dbOk = true;
        }
        catch { }
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
};
exports.AdminReportsService = AdminReportsService;
exports.AdminReportsService = AdminReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminReportsService);
//# sourceMappingURL=admin-reports.service.js.map