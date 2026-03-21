# Atlasio (Monorepo)

Kurumsal uzaktan eğitim platformu için başlangıç (production-ready iskelet).

## İçerik
- `apps/api`: NestJS + Prisma + JWT auth + RBAC + audit log + rapor export (PDF/CSV/XLSX/DOC/DOCX)
- `apps/web`: Next.js (App Router) + Tailwind + kurumsal navigasyon (header, breadcrumb, contextual back, recent/saved view)
- `infra`: Docker Compose (PostgreSQL + Redis) ve .env örnekleri

## Hızlı Başlangıç

### 1) Gereksinimler
- Node.js 20+
- Docker (PostgreSQL/Redis için)
- pnpm (`corepack enable`)

### 2) Kurulum
```bash
pnpm install
cp infra/.env.example .env
docker compose -f infra/docker-compose.yml up -d
pnpm db:setup
pnpm dev
```

### 3) Varsayılan URL’ler
- Web: http://localhost:3000
- API: http://localhost:4000
- Swagger: http://localhost:4000/docs
- Health: http://localhost:4000/health/ready

## Production Docker Deploy
```bash
cp infra/.env.prod.example infra/.env.prod
docker compose --env-file infra/.env.prod -f infra/docker-compose.prod.yml up -d --build
```

TLS (Let's Encrypt):
```bash
docker compose --env-file infra/.env.prod -f infra/docker-compose.prod.yml -f infra/docker-compose.prod.tls.yml up -d --build
docker compose --env-file infra/.env.prod -f infra/docker-compose.prod.yml -f infra/docker-compose.prod.tls.yml run --rm certbot
docker compose --env-file infra/.env.prod -f infra/docker-compose.prod.yml -f infra/docker-compose.prod.tls.yml restart nginx
```

Nginx route map:
- Web: `http://<host>/`
- API: `http://<host>/api/*`
- Swagger: `http://<host>/docs`
- Health: `http://<host>/health/ready`

Post-deploy probes:
```bash
BASE_URL=http://<host> pnpm smoke:prod
SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... SMTP_TO=... pnpm smtp:probe
```

## Kullanıcı Roller
- ADMIN
- INSTRUCTOR
- STUDENT

## Yeni Modüller
- Scheduled reports (`/reports/schedules`) + due dispatch endpoint
- Learning plans (`/learning-plans`)
- Certifications (`/certifications`)
- Ops metrics (`/ops/metrics`)
- Health checks (`/health`, `/health/ready`)
- Automation scheduler (dakikalık bakım işleri)

## Operasyon Dokümanları
- `docs/OPERATIONS.md`
- `docs/RELEASE_RUNBOOK.md`
- `docs/ROLLBACK.md`

## Not
Bu repo bir “tam teslim” için temeldir. Senin senaryona göre ekranları ve modülleri büyütürüz.

## Üretim (Ops) Hızlı Notlar
- **AUTH_BYPASS** prod’da kapalı olmalı (`AUTH_BYPASS=false`), güçlü bir **JWT_SECRET** kullanın ve `.env` dosyalarını repoya commit etmeyin. Secret manager / CI değişkenleri önerilir.
- **PM2 log rotasyonu** ayarlı (`pm2:log_max_size=10M`). PM2 yeniden başlat: `pnpm dlx pm2 restart atlasio-api --update-env`.
- **Migrate** (Prisma 5.x): `cd apps/api && pnpm dlx prisma migrate deploy --schema=prisma/schema.prisma`.
- **Health**: `/health` (liveness), `/health/ready` (readiness). Load balancer’a readiness’i bağlayın.
- **Rate-limit/WAF**: Güvenlik push butonları prod’da onaylı olsun; varsayılan olarak sessiz izleme.
- **Log/Saklama**: Uygulama loglarını 10MB döngü; uzun saklama istiyorsanız harici log toplama (ELK/Loki) ekleyin.
