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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const payment_providers_1 = require("./payment.providers");
const iyzico_service_1 = require("./providers/iyzico.service");
const paytr_sdk_1 = require("./providers/paytr.sdk");
const ops_webhook_service_1 = require("../ops/ops.webhook.service");
const notifications_service_1 = require("../notifications/notifications.service");
const anti_fraud_service_1 = require("./anti-fraud.service");
let PaymentsService = class PaymentsService {
    constructor(prisma, audit, iyzico, opsWebhook, notifications, antiFraud) {
        this.prisma = prisma;
        this.audit = audit;
        this.iyzico = iyzico;
        this.opsWebhook = opsWebhook;
        this.notifications = notifications;
        this.antiFraud = antiFraud;
    }
    async checkout(dto, userId, tenantId, ip) {
        await this.antiFraud.assertNotBlocked(ip);
        const amount = await this.calculateAmount(dto);
        const provider = dto.provider ?? (0, payment_providers_1.getProvider)();
        const pi = await this.prisma.paymentIntent.create({
            data: {
                provider,
                amount,
                currency: 'USD',
                userId,
                tenantId,
                courseId: dto.courseId,
                planId: dto.planId,
                seats: dto.seats,
                installments: dto.installments,
                metadata: { installments: dto.installments ?? null, ip },
            },
        });
        await this.audit.log({
            actorId: userId,
            action: 'payment.checkout.init',
            entity: 'PaymentIntent',
            entityId: pi.id,
            meta: { courseId: dto.courseId, planId: dto.planId, seats: dto.seats, installments: dto.installments },
        });
        if (provider === 'stripe') {
            const stripe = (0, payment_providers_1.stripeClient)();
            if (!stripe)
                throw new common_1.UnauthorizedException('Stripe configuration missing');
            const successUrl = `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/payments/success?pid=${pi.id}`;
            const cancelUrl = `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/payments/cancel?pid=${pi.id}`;
            const session = await stripe.checkout.sessions.create({
                mode: dto.planId ? 'subscription' : 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer_email: userId ? (await this.prisma.user.findUnique({ where: { id: userId } }))?.email : undefined,
                metadata: {
                    paymentId: pi.id,
                    courseId: dto.courseId ?? '',
                    planId: dto.planId ?? '',
                    tenantId: tenantId ?? '',
                },
                allow_promotion_codes: true,
                payment_method_options: dto.installments
                    ? {
                        card: {
                            installments: {
                                enabled: true,
                            },
                        },
                    }
                    : undefined,
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: { name: dto.planId ? 'Atlasio Plan' : 'Kurs' },
                            unit_amount: amount.toNumber() * 100,
                            recurring: dto.planId ? { interval: 'month' } : undefined,
                        },
                        quantity: dto.seats ?? 1,
                    },
                ],
            });
            const providerPaymentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
            await this.prisma.paymentIntent.update({
                where: { id: pi.id },
                data: { providerPaymentId },
            });
            return { paymentId: pi.id, checkoutUrl: session.url, provider: 'stripe' };
        }
        if (provider === 'demo') {
            const checkoutUrl = `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/payments/success?pid=${pi.id}`;
            return { paymentId: pi.id, checkoutUrl, provider: 'demo' };
        }
        if (provider === 'iyzico' || provider === 'paytr') {
            const dbUser = userId
                ? await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { id: true, email: true, name: true },
                })
                : null;
            if (provider === 'iyzico') {
                const url = await this.iyzico.createCheckout(dto, amount.toNumber(), dbUser ?? undefined);
                return { paymentId: pi.id, checkoutUrl: url, provider: 'iyzico' };
            }
            const url = await (0, paytr_sdk_1.paytrCreateCheckout)(dto, amount.toNumber(), 'TRY', dbUser?.email);
            return { paymentId: pi.id, checkoutUrl: url, provider: 'paytr' };
        }
        const checkoutUrl = `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/payments/success?pid=${pi.id}`;
        return { paymentId: pi.id, checkoutUrl, provider: provider };
    }
    async webhookHandled(providerPaymentId, status) {
        const pi = await this.prisma.paymentIntent.findFirst({ where: { providerPaymentId } });
        if (!pi)
            return { ok: false };
        const updated = await this.prisma.paymentIntent.update({
            where: { id: pi.id },
            data: {
                status,
                paidAt: status === 'SUCCEEDED' ? new Date() : pi.paidAt,
            },
        });
        await this.audit.log({
            action: 'payment.webhook',
            entity: 'PaymentIntent',
            entityId: pi.id,
            meta: { providerPaymentId, status },
        });
        if (status === 'SUCCEEDED') {
            await this.activateEnrollmentOrSubscription(pi);
            await this.antiFraud.clearFailures(pi.metadata?.ip);
        }
        if (status === 'FAILED') {
            await this.opsWebhook.notify('Payment failed', `Payment ${pi.id} failed`, pi);
            await this.notifications.sendAdminAlert('Ödeme başarısız', `Payment ${pi.id} failed`, pi);
            await this.antiFraud.recordFailure(pi.userId, pi.metadata?.ip);
        }
        return { ok: true, paymentId: pi.id, status: updated.status };
    }
    async history(userId) {
        return this.prisma.paymentIntent.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async calculateAmount(dto) {
        if (dto.planId) {
            const plan = await this.prisma.pricePlan.findUnique({ where: { id: dto.planId } });
            if (!plan)
                throw new common_1.BadRequestException('Plan not found');
            const seats = dto.seats ?? 1;
            return new client_1.Prisma.Decimal(plan.amount.toNumber() * seats);
        }
        if (dto.courseId) {
            const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
            if (!course)
                throw new common_1.BadRequestException('Course not found');
            return course.price;
        }
        throw new common_1.BadRequestException('No plan or course provided');
    }
    async activateEnrollmentOrSubscription(pi) {
        if (pi.courseId && pi.userId) {
            await this.prisma.enrollment.upsert({
                where: { userId_courseId: { userId: pi.userId, courseId: pi.courseId } },
                create: { userId: pi.userId, courseId: pi.courseId },
                update: {},
            });
            await this.audit.log({ action: 'payment.enrollment.activated', entity: 'Enrollment', actorId: pi.userId, meta: { courseId: pi.courseId, paymentId: pi.id } });
        }
        if (pi.planId && pi.tenantId) {
            const seats = pi.seats ?? 1;
            const plan = await this.prisma.pricePlan.findUnique({ where: { id: pi.planId } });
            if (plan && plan.type === 'MODULE_ADDON') {
                const activeSub = await this.prisma.subscription.findFirst({
                    where: { tenantId: pi.tenantId, status: 'ACTIVE' }
                });
                if (activeSub && plan.features) {
                    const currentAddons = activeSub.addons || [];
                    const newAddonKeys = Object.keys(plan.features).filter(k => plan.features[k] === true);
                    for (const addon of newAddonKeys) {
                        if (!currentAddons.includes(addon))
                            currentAddons.push(addon);
                    }
                    await this.prisma.subscription.update({
                        where: { id: activeSub.id },
                        data: { addons: currentAddons }
                    });
                    await this.audit.log({ action: 'payment.addon.activated', entity: 'Subscription', meta: { planId: pi.planId, tenantId: pi.tenantId, addons: newAddonKeys } });
                }
            }
            else {
                await this.prisma.subscription.create({
                    data: {
                        tenantId: pi.tenantId,
                        planId: pi.planId,
                        seats,
                        status: 'ACTIVE',
                        provider: (0, payment_providers_1.getProvider)(),
                        providerSubscriptionId: pi.id,
                    },
                });
                await this.audit.log({ action: 'payment.subscription.activated', entity: 'Subscription', meta: { planId: pi.planId, tenantId: pi.tenantId, seats } });
            }
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        iyzico_service_1.IyzicoService,
        ops_webhook_service_1.OpsWebhookService,
        notifications_service_1.NotificationsService,
        anti_fraud_service_1.AntiFraudService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map