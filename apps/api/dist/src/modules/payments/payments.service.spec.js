"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const payments_service_1 = require("./payments.service");
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
    const prisma = mockPrisma();
    const audit = mockAudit();
    const iyzico = mockIyzico();
    const opsWebhook = mockOpsWebhook();
    const notifications = mockNotifications();
    const antiFraud = mockAntiFraud();
    const service = new payments_service_1.PaymentsService(prisma, audit, iyzico, opsWebhook, notifications, antiFraud);
    return { service, prisma, audit, notifications, antiFraud };
}
const mockPaymentIntent = {
    id: 'pi-1',
    provider: 'demo',
    amount: new client_1.Prisma.Decimal(99),
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
describe('PaymentsService.checkout', () => {
    it('demo provider ile checkoutUrl döner', async () => {
        const { service, prisma } = buildService();
        prisma.course.findUnique.mockResolvedValue({
            id: 'course-1',
            price: new client_1.Prisma.Decimal(99),
        });
        prisma.paymentIntent.create.mockResolvedValue(mockPaymentIntent);
        const result = await service.checkout({ courseId: 'course-1' }, 'user-1', 'tenant-1', '127.0.0.1');
        expect(result.paymentId).toBe('pi-1');
        expect(result.checkoutUrl).toContain('/payments/success');
        expect(result.provider).toBe('demo');
    });
    it('kurs bulunamazsa BadRequestException fırlatır', async () => {
        const { service, prisma } = buildService();
        prisma.course.findUnique.mockResolvedValue(null);
        await expect(service.checkout({ courseId: 'nonexistent-course' }, 'user-1')).rejects.toThrow(common_1.BadRequestException);
    });
    it('plan bulunamazsa BadRequestException fırlatır', async () => {
        const { service, prisma } = buildService();
        prisma.pricePlan.findUnique.mockResolvedValue(null);
        await expect(service.checkout({ planId: 'nonexistent-plan' }, 'user-1')).rejects.toThrow(common_1.BadRequestException);
    });
    it('engellenen IP AntiFraud hatası fırlatınca checkout duraklar', async () => {
        const { service, antiFraud } = buildService();
        antiFraud.assertNotBlocked.mockRejectedValue(new common_1.UnauthorizedException('IP blocked'));
        await expect(service.checkout({ courseId: 'course-1' }, 'user-1', undefined, '10.0.0.1')).rejects.toThrow(common_1.UnauthorizedException);
    });
});
describe('PaymentsService.webhookHandled', () => {
    it('SUCCEEDED durumunda enrollment aktifleştirir', async () => {
        const { service, prisma } = buildService();
        prisma.paymentIntent.findFirst.mockResolvedValue({
            ...mockPaymentIntent,
            providerPaymentId: 'stripe-pi-123',
            courseId: 'course-1',
            metadata: { ip: '127.0.0.1' },
        });
        prisma.paymentIntent.update.mockResolvedValue({
            ...mockPaymentIntent,
            status: 'SUCCEEDED',
        });
        prisma.enrollment.upsert.mockResolvedValue({});
        const result = await service.webhookHandled('stripe-pi-123', 'SUCCEEDED');
        expect(result.ok).toBe(true);
        expect(result.status).toBe('SUCCEEDED');
        expect(prisma.enrollment.upsert).toHaveBeenCalledTimes(1);
    });
    it('FAILED durumunda admin alarmı gönderilir', async () => {
        const { service, prisma, notifications } = buildService();
        prisma.paymentIntent.findFirst.mockResolvedValue({
            ...mockPaymentIntent,
            providerPaymentId: 'stripe-pi-456',
            metadata: {},
        });
        prisma.paymentIntent.update.mockResolvedValue({
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
        prisma.paymentIntent.findFirst.mockResolvedValue(null);
        const result = await service.webhookHandled('unknown-id', 'SUCCEEDED');
        expect(result.ok).toBe(false);
    });
});
describe('PaymentsService.history', () => {
    it('kullanıcının ödeme geçmişini döner', async () => {
        const { service, prisma } = buildService();
        prisma.paymentIntent.findMany.mockResolvedValue([mockPaymentIntent]);
        const result = await service.history('user-1');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('pi-1');
    });
});
//# sourceMappingURL=payments.service.spec.js.map