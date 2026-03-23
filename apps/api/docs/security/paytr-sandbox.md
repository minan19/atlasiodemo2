# PayTR Sandbox Hızlı Test

## Env
- PAYMENT_PROVIDER=paytr
- PAYTR_MERCHANT_ID
- PAYTR_MERCHANT_KEY
- PAYTR_MERCHANT_SALT
- WEB_BASE_URL (ör: http://localhost:3000)
- NEXT_PUBLIC_API_BASE (ör: http://localhost:4000)
- REDIS aktif (anti-fraud)

## Akış
1) `pnpm dev` (api) ve `pnpm dev` (web) çalışsın.
2) `/pay` sayfasından taksitli (installments>1) ve taksitsiz checkout dene.
3) API `payments/checkout` → iframe URL döner (`https://www.paytr.com/odeme/guvenli/<token>`).
4) Sandbox ödeme tamamla; webhook yoksa PaymentIntent status PENDING kalır, manual webhook için:
   ```
   curl -X POST http://localhost:4000/payments/webhook -H 'Content-Type: application/json' -d '{"providerPaymentId":"<paytr_pid>","status":"SUCCEEDED"}'
   ```
5) Beklenen: PaymentIntent status SUCCEEDED, enrollment/subscription oluşur, anti-fraud sayaç sıfırlanır.

## Fail senaryosu
- 5 ardışık FAILED webhook gönder: IP bloklanır, ops webhook + admin mail alarmı gelir.

## Temizlik
- Redis: `del pfail:<ip>` ve `del pblock:<ip>`
