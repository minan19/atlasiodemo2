import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CheckoutDto } from './dto';
import { Prisma } from '@prisma/client';
import { getProvider, stripeClient } from './payment.providers';
import { IyzicoService } from './providers/iyzico.service';
import { paytrCreateCheckout } from './providers/paytr.sdk';
import { OpsWebhookService } from '../ops/ops.webhook.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AntiFraudService } from './anti-fraud.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly iyzico: IyzicoService,
    private readonly opsWebhook: OpsWebhookService,
    private readonly notifications: NotificationsService,
    private readonly antiFraud: AntiFraudService,
  ) {}

  /**
   * Checkout endpoint: creates PaymentIntent and returns a provider checkout URL.
   * Eğer STRIPE_SECRET tanımlıysa Stripe Checkout Session açar; yoksa demo URL döner.
   */
  async checkout(dto: CheckoutDto, userId?: string, tenantId?: string, ip?: string) {
    await this.antiFraud.assertNotBlocked(ip);
    const amount = await this.calculateAmount(dto);
    const provider = (dto.provider as any) ?? getProvider();
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
        metadata: { installments: dto.installments ?? null, ip } as Prisma.InputJsonValue,
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
      const stripe = stripeClient();
      if (!stripe) throw new UnauthorizedException('Stripe configuration missing');
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
      // Gerçek kullanıcı bilgisini çek (iyzico ve paytr için zorunlu)
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

      // paytr
      const url = await paytrCreateCheckout(dto, amount.toNumber(), 'TRY', dbUser?.email);
      return { paymentId: pi.id, checkoutUrl: url, provider: 'paytr' };
    }
    const checkoutUrl = `${process.env.WEB_BASE_URL ?? 'http://localhost:3000'}/payments/success?pid=${pi.id}`;
    return { paymentId: pi.id, checkoutUrl, provider: provider };
  }

  async webhookHandled(providerPaymentId: string, status: 'SUCCEEDED' | 'FAILED') {
    const pi = await this.prisma.paymentIntent.findFirst({ where: { providerPaymentId } });
    if (!pi) return { ok: false };
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
      await this.antiFraud.clearFailures((pi.metadata as any)?.ip);
    }
    if (status === 'FAILED') {
      await this.opsWebhook.notify('Payment failed', `Payment ${pi.id} failed`, pi);
      await this.notifications.sendAdminAlert('Ödeme başarısız', `Payment ${pi.id} failed`, pi);
      await this.antiFraud.recordFailure(pi.userId, (pi.metadata as any)?.ip);
    }
    return { ok: true, paymentId: pi.id, status: updated.status };
  }

  async history(userId: string) {
    return this.prisma.paymentIntent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async calculateAmount(dto: CheckoutDto): Promise<Prisma.Decimal> {
    if (dto.planId) {
      const plan = await this.prisma.pricePlan.findUnique({ where: { id: dto.planId } });
      if (!plan) throw new BadRequestException('Plan not found');
      const seats = dto.seats ?? 1;
      return new Prisma.Decimal(plan.amount.toNumber() * seats);
    }
    // fallback: course price
    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
      if (!course) throw new BadRequestException('Course not found');
      return course.price;
    }
    throw new BadRequestException('No plan or course provided');
  }

  private async activateEnrollmentOrSubscription(pi: { id: string; courseId?: string | null; planId?: string | null; userId?: string | null; tenantId?: string | null; seats?: number | null }) {
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
           const currentAddons = (activeSub.addons as string[]) || [];
           const newAddonKeys = Object.keys(plan.features).filter(k => (plan.features as any)[k] === true);

           for (const addon of newAddonKeys) {
              if (!currentAddons.includes(addon)) currentAddons.push(addon);
           }

           await this.prisma.subscription.update({
              where: { id: activeSub.id },
              data: { addons: currentAddons as any }
           });
           await this.audit.log({ action: 'payment.addon.activated', entity: 'Subscription', meta: { planId: pi.planId, tenantId: pi.tenantId, addons: newAddonKeys } });
        }
      } else {
        await this.prisma.subscription.create({
          data: {
            tenantId: pi.tenantId,
            planId: pi.planId,
            seats,
            status: 'ACTIVE',
            provider: getProvider(),
            providerSubscriptionId: pi.id,
          },
        });
        await this.audit.log({ action: 'payment.subscription.activated', entity: 'Subscription', meta: { planId: pi.planId, tenantId: pi.tenantId, seats } });
      }
    }
  }
}
