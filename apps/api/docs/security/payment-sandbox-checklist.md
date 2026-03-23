# Ödeme Sandbox Smoke Test Checklist

## Ortam
- API: http://localhost:4000 (veya staging URL)
- WEB: http://localhost:3000
- Redis açık (anti-fraud için)
- Env:
  - STRIPE_SECRET (sandbox)
  - PAYTR_MERCHANT_ID / PAYTR_MERCHANT_KEY / PAYTR_MERCHANT_SALT (sandbox)
  - IYZICO_API_KEY / IYZICO_SECRET (sandbox)
  - PAYMENT_PROVIDER=paytr (veya iyzico/stripe)
  - OPS_WEBHOOK_URL + OPS_WEBHOOK_SECRET (alarm için)
  - WEB_BASE_URL, NEXT_PUBLIC_API_BASE, NEXT_PUBLIC_TENANT_ID

## Test adımları
1) **Stripe (varsa)**
   - PAYMENT_PROVIDER=stripe
   - /pay sayfasından courseId veya planId ile checkout
   - Test kartı: 4242 4242 4242 4242 (success)
   - Beklenen: redirect success; Enrollment/Subscription oluşur; anti-fraud fail sayacı sıfırlanır.

2) **PayTR sandbox**
   - PAYMENT_PROVIDER=paytr
   - /pay ile taksit >1 seçeneği de dene
   - Beklenen: iframe URL döner, sandbox ödemeyi tamamlayınca webhook yoksa success sayfası manuel test; ops webhook yoksa PaymentIntent SUCCEEDED için manuel `payments/webhook` çağrısı yapılabilir.

3) **Iyzico sandbox**
   - PAYMENT_PROVIDER=iyzico
   - /pay checkout
   - Beklenen: iyzico form URL döner.

4) **Anti-fraud**
   - Aynı IP’den ardışık 5 hatalı ödeme denemesi (örn. webhook’ta FAILED gönder)
   - Beklenen: IP block (Redis pblock), ops webhook + admin mail alarm.

5) **Alarm görünürlüğü**
   - /notifications/alarms (admin/tech ile) → payment failed alarmı görünür olmalı.

6) **RLS doğrulaması**
   - Tenant header olmadan çağrı: RLS nedeniyle Course listesi boş dönmeli.
   - Header `X-Tenant-ID` ile normal veri dönmeli.

7) **E2E**
   - Kurs satın al → Enrollment oluşur → Dashboard’da görünüyor.
   - Plan satın al → Subscription kaydı oluşur.

## Rollback / Temizlik
- Redis: `del pfail:<ip>` ve `del pblock:<ip>`
- PaymentIntent test kayıtları: DB’de temizleme (isteğe bağlı)
