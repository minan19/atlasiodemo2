import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IyzicoService } from './providers/iyzico.service';
import { OpsWebhookService } from '../ops/ops.webhook.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AntiFraudService } from './anti-fraud.service';

// ESM bağımlılıklarını ve dış sağlayıcıları mock'a al
jest.mock('./payment.providers', () => ({
  getProvider: jest.fn().mockReturnValue('demo'),
  stripeClient: jest.fn().mockReturnValue(null),
}));
jest.mock('./providers/paytr.sdk', () => ({
  paytrCreateCheckout: jest.fn().mockResolvedValue('https://paytr.demo/checkout'),
}));
jest.mock('../ops/ops.webhook.service');
jest.mock('./providers/iyzico.service');
jest.mock('./anti-fraud.service');

const mockPrisma = () => ({
  paymentIntent: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  pricePlan: {
    findUnique: jest.fn(),
  },
  course: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  enrollment: {
    upsert: jest.fn(),
  },
  userSubscription: {
    upsert: jest.fn(),
  },
});

const mockAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });
const mockIyzico = () => ({ createCheckout: jest.fn() });
const mockOpsWebhook = () => ({ notify: jest.fn().mockResolvedValue(undefined) });
const mockNotifications = () => ({
  sendAdminAlert: jest.fn().mockResolvedValue(undefined),
  pushAlarm: jest.fn(),
});
const mockAntiFraud = () => ({
  assertNotBlocked: jest.fn().mockResolvedValue(undefined),
  clearFailures: jest.fn().mockResolvedValue(undefined),
  recordFailure: jest.fn().mockResolvedValue(undefined),
});

function buildService() {
  const prisma = mockPrisma() as unknown as PrismaService;
  const audit = mockAudit() as unknown as AuditService;
  const iyzico = mockIyzico() as unknown as IyzicoService;
  const opsWebhook = mockOpsWebhook() as unknown as OpsWebhookService;
  const notifications = mockNotifications() as unknown as NotificationsService;
  const antiFraud = mockAntiFraud() as unknown as AntiFraudService;

  const service = new PaymentsService(prisma, audit, iyzico, opsWebhook, notifications, antiFraud);
  return { service, prisma, audit, notifications, antiFraud };
}

const mockPaymentIntent = {
  id: 'pi-1',
  provider: 'demo',
  amount: new Prisma.Decimal(99),
  currency: 'USD',
  userId: 'user-1',
  courseId: 'course-1',
  planId: null,
  seats: 1,
  status: 'PENDING',
  metadata: {},
  paidAt: null,
  providerPaymentId: null,
};

// ─── checkout ─────────────────────────────────────────────────────────────────

describe('PaymentsService.checkout', () => {
  it('demo provider ile checkoutUrl döner', async () => {
    const { service, prisma } = buildService();
    (prisma.course.findUnique as jest.Mock).mockResolvedValue({
      id: 'course-1',
      price: new Prisma.Decimal(99),
    });
    (prisma.paymentIntent.create as jest.Mock).mockResolvedValue(mockPaymentIntent);

    const result = await service.checkout(
      { courseId: 'course-1' },
      'user-1',
      'tenant-1',
      '127.0.0.1',
    );

    expect(result.paymentId).toBe('pi-1');
    expect(result.checkoutUrl).toContain('/payments/success');
    expect(result.provider).toBe('demo');
  });

  it('kurs bulunamazsa BadRequestException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.checkout({ courseId: 'nonexistent-course' }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('plan bulunamazsa BadRequestException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.pricePlan.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.checkout({ planId: 'nonexistent-plan' }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('engellenen IP AntiFraud hatası fırlatınca checkout duraklar', async () => {
    const { service, antiFraud } = buildService();
    (antiFraud.assertNotBlocked as jest.Mock).mockRejectedValue(
      new UnauthorizedException('IP blocked'),
    );

    await expect(
      service.checkout({ courseId: 'course-1' }, 'user-1', undefined, '10.0.0.1'),
    ).rejects.toThrow(UnauthorizedException);
  });
});

// ─── webhookHandled ───────────────────────────────────────────────────────────

describe('PaymentsService.webhookHandled', () => {
  it('SUCCEEDED durumunda enrollment aktifleştirir', async () => {
    const { service, prisma } = buildService();
    (prisma.paymentIntent.findFirst as jest.Mock).mockResolvedValue({
      ...mockPaymentIntent,
      providerPaymentId: 'stripe-pi-123',
      courseId: 'course-1',
      metadata: { ip: '127.0.0.1' },
    });
    (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({
      ...mockPaymentIntent,
      status: 'SUCCEEDED',
    });
    (prisma.enrollment.upsert as jest.Mock).mockResolvedValue({});

    const result = await service.webhookHandled('stripe-pi-123', 'SUCCEEDED');

    expect(result.ok).toBe(true);
    expect(result.status).toBe('SUCCEEDED');
    expect(prisma.enrollment.upsert).toHaveBeenCalledTimes(1);
  });

  it('FAILED durumunda admin alarmı gönderilir', async () => {
    const { service, prisma, notifications } = buildService();
    (prisma.paymentIntent.findFirst as jest.Mock).mockResolvedValue({
      ...mockPaymentIntent,
      providerPaymentId: 'stripe-pi-456',
      metadata: {},
    });
    (prisma.paymentIntent.update as jest.Mock).mockResolvedValue({
      ...mockPaymentIntent,
      status: 'FAILED',
    });

    const result = await service.webhookHandled('stripe-pi-456', 'FAILED');

    expect(result.ok).toBe(true);
    expect(result.status).toBe('FAILED');
    expect(notifications.sendAdminAlert).toHaveBeenCalledTimes(1);
  });

  it('providerPaymentId bulunamazsa ok:false döner', async () => {
    const { service, prisma } = buildService();
    (prisma.paymentIntent.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await service.webhookHandled('unknown-id', 'SUCCEEDED');

    expect(result.ok).toBe(false);
  });
});

// ─── history ──────────────────────────────────────────────────────────────────

describe('PaymentsService.history', () => {
  it('kullanıcının ödeme geçmişini döner', async () => {
    const { service, prisma } = buildService();
    (prisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([mockPaymentIntent]);

    const result = await service.history('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pi-1');
  });
});
