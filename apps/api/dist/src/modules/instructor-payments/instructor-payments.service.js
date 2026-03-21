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
exports.InstructorPaymentsService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../audit/audit.service");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let InstructorPaymentsService = class InstructorPaymentsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    normalizeRange(range) {
        const now = new Date();
        const end = range?.end ? new Date(range.end) : now;
        const start = range?.start ? new Date(range.start) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        if (start >= end) {
            start.setTime(end.getTime() - 24 * 60 * 60 * 1000);
        }
        return { start, end };
    }
    toDecimal(value) {
        return new client_1.Prisma.Decimal(value ?? 0);
    }
    async buildSummary(instructorId, start, end) {
        const profile = await this.prisma.instructorPayoutProfile.findFirst({
            where: { instructorId },
            orderBy: { updatedAt: 'desc' },
        });
        const [enrollments, refunds] = await Promise.all([
            this.prisma.enrollment.findMany({
                where: {
                    Course: { instructorId },
                    completedAt: { gte: start, lte: end },
                    refundedAt: null,
                },
                include: { Course: true },
            }),
            this.prisma.enrollment.findMany({
                where: {
                    Course: { instructorId },
                    refundedAt: { gte: start, lte: end },
                },
                include: { Course: true },
            }),
        ]);
        const revenue = enrollments.reduce((sum, enrollment) => {
            return sum.plus(this.toDecimal(enrollment.Course?.price));
        }, new client_1.Prisma.Decimal(0));
        const refundImpact = refunds.reduce((sum, enrollment) => {
            return sum.plus(this.toDecimal(enrollment.Course?.price));
        }, new client_1.Prisma.Decimal(0));
        const baseFee = this.toDecimal(profile?.baseFee);
        const perEnrollmentFee = this.toDecimal(profile?.perEnrollmentFee);
        const revenueShare = this.toDecimal(profile?.revenueShare);
        const perEnrollmentTotal = perEnrollmentFee.mul(enrollments.length);
        const revenueShareTotal = revenue.mul(revenueShare);
        const payoutAmount = baseFee.plus(perEnrollmentTotal).plus(revenueShareTotal);
        return {
            instructorId,
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            completedEnrollments: enrollments.length,
            refundCount: refunds.length,
            courseRevenue: revenue.toString(),
            refundImpact: refundImpact.toString(),
            baseFee: baseFee.toString(),
            perEnrollmentFee: perEnrollmentFee.toString(),
            revenueShare: revenueShare.toString(),
            perEnrollmentTotal: perEnrollmentTotal.toString(),
            revenueShareTotal: revenueShareTotal.toString(),
            payoutAmount: payoutAmount.toString(),
        };
    }
    async summarize(instructorId, range) {
        const { start, end } = this.normalizeRange(range);
        return this.buildSummary(instructorId, start, end);
    }
    async generatePayout(instructorId, range, actorId, opts) {
        const { start, end } = this.normalizeRange(range);
        const summary = await this.buildSummary(instructorId, start, end);
        const key = { instructorId, periodStart: start, periodEnd: end };
        const existing = await this.prisma.instructorPayment.findUnique({
            where: { instructorId_periodStart_periodEnd: key },
        });
        if (existing && !opts?.force) {
            return { payment: existing, summary };
        }
        const payload = {
            instructorId,
            periodStart: start,
            periodEnd: end,
            completedEnrollments: summary.completedEnrollments,
            refundCount: summary.refundCount,
            courseRevenue: new client_1.Prisma.Decimal(summary.courseRevenue),
            amount: new client_1.Prisma.Decimal(summary.payoutAmount),
            details: summary,
            recordedById: actorId,
        };
        const payment = await this.prisma.instructorPayment.upsert({
            where: { instructorId_periodStart_periodEnd: key },
            create: payload,
            update: {
                ...payload,
                status: existing?.status ?? client_1.InstructorPaymentStatus.PENDING,
                paidAt: existing?.paidAt,
                recordedById: existing?.recordedById ?? actorId,
            },
        });
        await this.audit.log({
            action: 'instructorPayment.generate',
            entity: 'InstructorPayment',
            entityId: payment.id,
            actorId,
            meta: { summary },
        });
        return { payment, summary };
    }
    async listPayments(instructorId, limit = 20) {
        return this.prisma.instructorPayment.findMany({
            where: { instructorId },
            orderBy: { periodStart: 'desc' },
            take: limit,
        });
    }
    async listAllPayments(limit = 20) {
        return this.prisma.instructorPayment.findMany({
            orderBy: { periodStart: 'desc' },
            take: limit,
        });
    }
    async markPaid(paymentId, actorId, notes) {
        const payment = await this.prisma.instructorPayment.update({
            where: { id: paymentId },
            data: {
                status: client_1.InstructorPaymentStatus.PAID,
                paidAt: new Date(),
                notes,
            },
        });
        await this.audit.log({
            action: 'instructorPayment.markPaid',
            entity: 'InstructorPayment',
            entityId: payment.id,
            actorId,
            meta: { notes },
        });
        return payment;
    }
    async runDailyPayroll(actorId) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const start = new Date(yesterday);
        start.setHours(0, 0, 0, 0);
        const end = new Date(yesterday);
        end.setHours(23, 59, 59, 999);
        const instructors = await this.prisma.user.findMany({
            where: { role: 'INSTRUCTOR' },
            select: { id: true },
        });
        const results = [];
        for (const instructor of instructors) {
            const { payment } = await this.generatePayout(instructor.id, { start, end }, actorId);
            results.push({ paymentId: payment.id, instructorId: instructor.id });
        }
        return { count: results.length, entries: results };
    }
};
exports.InstructorPaymentsService = InstructorPaymentsService;
exports.InstructorPaymentsService = InstructorPaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], InstructorPaymentsService);
//# sourceMappingURL=instructor-payments.service.js.map