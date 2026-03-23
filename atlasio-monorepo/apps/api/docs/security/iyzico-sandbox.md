# İyzico Sandbox Hızlı Test

## Env
- PAYMENT_PROVIDER=iyzico
- IYZICO_API_KEY
- IYZICO_SECRET
- IYZICO_BASE_URL (varsayılan sandbox: https://sandbox-api.iyzipay.com)
- WEB_BASE_URL (örn: http://localhost:3000)
- NEXT_PUBLIC_API_BASE (örn: http://localhost:4000)
- REDIS (anti-fraud için önerilir)

## Akış
1) API ve Web çalışır (`pnpm dev`).
2) `/pay` sayfasından courseId veya planId ile checkout başlat.
3) API `payments/checkout` → iyzico ödeme formu URL’si döner.
4) Sandbox ödeme formunu tamamla; iyzico webhooku yoksa PaymentIntent PENDING kalır, manuel tetiklemek için:
   ```bash
   curl -X POST http://localhost:4000/payments/webhook \
     -H 'Content-Type: application/json' \
     -d '{"providerPaymentId":"<iyzico_payment_id>","status":"SUCCEEDED"}'
   ```
5) Beklenen: PaymentIntent SUCCEEDED; enrollment/subscription oluşur.

## Fail senaryosu
- FAILED webhook 5 kez aynı IP’den gönder → anti-fraud IP blok, ops webhook + admin mail alarmı.

## Temizlik
- Redis: `del pfail:<ip>` ve `del pblock:<ip>`
