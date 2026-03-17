import { Injectable, BadRequestException } from '@nestjs/common';
import { CheckoutDto } from '../dto';
import { iyzicoCreateCheckout, type IyzicoUser } from './iyzico.sdk';

/**
 * iyzico entegrasyonu: iyzipay SDK ile gerçek ödeme başlatır.
 * PROD için: IYZICO_API_KEY, IYZICO_SECRET, IYZICO_BASE_URL env'lerini ayarla.
 */
@Injectable()
export class IyzicoService {
  async createCheckout(dto: CheckoutDto, amount: number, user?: IyzicoUser) {
    if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET) {
      throw new BadRequestException('Iyzico API bilgileri tanımlı değil');
    }
    return iyzicoCreateCheckout(dto, amount, user);
  }
}
