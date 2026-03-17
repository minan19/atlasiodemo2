# Atlasio Backend (kopya)

## Kurulum
```
pnpm install   # veya npm install
dpnm run dev   # nodemon server.js (PORT varsayılan 5000)
```

## Çevre Değişkenleri
`.env.example` dosyasını kopyalayın ve değerleri güncelleyin:
```
cp .env.example .env
```
Önemli alanlar: `CORS_ORIGINS`, `DB_*`, `JWT_SECRET`.

## Sağlık ve ping
- Sağlık: `GET /api/health` (DB ping süresi ve socket oda sayısı döner)
- Admin örnek ping: `GET /api/auth/admin/ping` (Authorization: Bearer <token>, roller: admin/head-instructor)
- Hızlı sağlık scripti: `pnpm run check:health`

## Güvenlik
- CORS origin listesi `.env` üzerinden tanımlı
- Rate limit: 15 dakikada 500 istek
- Giriş/ kayıt request validasyonu (`express-validator`)
- JWT payload: `{ id, role }`, süre default 12h

## Soket
- WebRTC sinyalizasyonu `sockets/webrtcHandler.js`; odalar `join-lesson` ile açılır.

## Not
Frontend değişiklikleri `/Users/mustafainan/Downloads/atlasio-monorepo/apps/web` dizinindedir; bu repo sadece backend API + socket içindir.
