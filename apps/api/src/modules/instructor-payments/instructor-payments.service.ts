import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { InstructorPaymentStatus, Prisma } from '@prisma/client';

type RangeInput = { start?: string | Date; end?: string | Date };

type PayoutSummary = {
  instructorId: string;
  periodStart: string;
  periodEnd: string;
  completedEnrollments: number;
  refundCount: number;
  courseRevenue: string;
  refundImpact: string;
  baseFee: string;
  perEnrollmentFee: string;
  revenueShare: string;
  perEnrollmentTotal: string;
  revenueShareTotal: string;
  payoutAmount: string;
};

@Injectable()
export class InstructorPaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private normalizeRange(range?: RangeInput) {
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

  private toDecimal(value?: Prisma.Decimal.Value) {
    return new Prisma.Decimal(value ?? 0);
  }

  private async buildSummary(instructorId: string, start: Date, end: Date): Promise<PayoutSummary> {
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

    const revenue = enrollments.reduce((sum: Prisma.Decimal, enrollment: any) => {
      return sum.plus(this.toDecimal(enrollment.Course?.price));
    }, new Prisma.Decimal(0));

    const refundImpact = refunds.reduce((sum: Prisma.Decimal, enrollment: any) => {
      return sum.plus(this.toDecimal(enrollment.Course?.price));
    }, new Prisma.Decimal(0));

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

  async summarize(instructorId: string, range?: RangeInput) {
    const { start, end } = this.normalizeRange(range);
    return this.buildSummary(instructorId, start, end);
  }

  async generatePayout(
    instructorId: string,
    range?: RangeInput,
    actorId?: string,
    opts?: { force?: boolean },
  ) {
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
      courseRevenue: new Prisma.Decimal(summary.courseRevenue),
      amount: new Prisma.Decimal(summary.payoutAmount),
      details: summary,
      recordedById: actorId,
    };

    const payment = await this.prisma.instructorPayment.upsert({
      where: { instructorId_periodStart_periodEnd: key },
      create: payload,
      update: {
        ...payload,
        status: existing?.status ?? InstructorPaymentStatus.PENDING,
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

  async listPayments(instructorId: string, limit = 20) {
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

  async markPaid(paymentId: string, actorId?: string, notes?: string) {
    const payment = await this.prisma.instructorPayment.update({
      where: { id: paymentId },
      data: {
        status: InstructorPaymentStatus.PAID,
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

  async runDailyPayroll(actorId?: string) {
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

    const results = [] as { paymentId: string; instructorId: string }[];
    for (const instructor of instructors) {
      const { payment } = await this.generatePayout(
        instructor.id,
        { start, end },
        actorId,
      );
      results.push({ paymentId: payment.id, instructorId: instructor.id });
    }

    return { count: results.length, entries: results };
  }
}
