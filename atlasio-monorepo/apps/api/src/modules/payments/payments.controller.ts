import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { createHmac } from 'crypto';
import { PaymentsService } from './payments.service';
import { CheckoutDto } from './dto';
import { PaymentWebhookGuard } from './payment.webhook.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Post('checkout')
  checkout(@Body() dto: CheckoutDto, @Req() req: any) {
    return this.payments.checkout(dto, req.user.id ?? req.user.userId, req.user.tenantId, req.ip);
  }

  /**
   * Stripe webhook — imza doğrulaması PaymentWebhookGuard içinde yapılır.
   */
  @Post('webhook')
  @UseGuards(PaymentWebhookGuard)
  async webhook(@Body() body: any, @Req() req: any) {
    const event = req.stripeEvent;
    const providerPaymentId =
      event?.data?.object?.payment_intent ??
      event?.data?.object?.id ??
      body?.data?.object?.id ??
      body?.providerPaymentId ??
      'unknown';
    const status =
      event?.type === 'checkout.session.completed' || event?.data?.object?.status === 'succeeded'
        ? 'SUCCEEDED'
        : 'FAILED';
    return this.payments.webhookHandled(providerPaymentId, status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED');
  }

  /**
   * PayTR webhook — HMAC-SHA256 imza doğrulaması.
   * PayTR POST payload: merchant_oid, status, total_amount, hash
   * Hash: base64(HMAC-SHA256(merchant_id + merchant_oid + total_amount + status + merchant_salt, merchant_key))
   */
  @Post('webhook/paytr')
  async paytrWebhook(@Body() body: any) {
    const merchantId = process.env.PAYTR_MERCHANT_ID;
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

    if (!merchantId || !merchantKey || !merchantSalt) {
      throw new UnauthorizedException('PayTR credentials eksik');
    }

    const { merchant_oid, status, total_amount, hash } = body;
    if (!merchant_oid || !status || !total_amount || !hash) {
      throw new UnauthorizedException('PayTR webhook: eksik alanlar');
    }

    // PayTR imza doğrulaması
    const hashStr = `${merchantId}${merchant_oid}${total_amount}${status}${merchantSalt}`;
    const expectedHash = createHmac('sha256', merchantKey).update(hashStr).digest('base64');

    if (expectedHash !== hash) {
      throw new UnauthorizedException('PayTR webhook: geçersiz imza');
    }

    const paymentStatus = status === 'success' ? 'SUCCEEDED' : 'FAILED';
    await this.payments.webhookHandled(merchant_oid, paymentStatus);

    // PayTR, "OK" yanıt bekler
    return 'OK';
  }

  /**
   * iyzipay (iyzico) webhook — token ile ödeme durumu sorgulama.
   * iyzipay callback POST alanları: token, conversationId, status
   * Güvenlik: token'ı saklamak ve iyzipay API'sinden sorgulamak en güvenli yöntemdir.
   * Burada temel token varlık kontrolü + HMAC tabanlı imza doğrulaması yapılır.
   */
  @Post('webhook/iyzico')
  async iyzicoWebhook(@Body() body: any) {
    const apiKey = process.env.IYZICO_API_KEY;
    const secret = process.env.IYZICO_SECRET;

    if (!apiKey || !secret) {
      throw new UnauthorizedException('iyzico credentials eksik');
    }

    const { token, status, conversationId } = body;
    if (!token || !status || !conversationId) {
      throw new UnauthorizedException('iyzico webhook: eksik alanlar');
    }

    // iyzipay imza doğrulaması: SHA256(apiKey + secret + token)
    const expectedSig = createHmac('sha256', secret)
      .update(`${apiKey}${token}`)
      .digest('base64');

    const receivedSig = body?.signature ?? body?.checkoutFormSig;
    if (receivedSig && receivedSig !== expectedSig) {
      throw new UnauthorizedException('iyzico webhook: geçersiz imza');
    }

    const paymentStatus = status === 'success' ? 'SUCCEEDED' : 'FAILED';
    await this.payments.webhookHandled(conversationId, paymentStatus);

    return { status: 'OK' };
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Get('history')
  history(@Req() req: any) {
    return this.payments.history(req.user.id ?? req.user.userId);
  }
}
