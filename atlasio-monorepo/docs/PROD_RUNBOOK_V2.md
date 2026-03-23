# Atlasio Prod Runbook (2026-02-16)

Bu belge prod ortamına çıkış, geri dönüş ve acil durum yönetimi için tek kaynaktır. Tüm tarih/saatler ISO‑8601, zaman dilimi UTC+03 kabul edilmiştir.

## 0. Özet Kapı (GO/LIVE Gate)
- DNS doğru IP’ye yönlü (atlasio.tr, api.atlasio.tr, admin.atlasio.tr)
- Let’s Encrypt sertifika yenileme `certbot renew --dry-run` geçiyor
- `/health` ve `/docs` yanıt veriyor (200)
- Backup + restore testi son 14 gün içinde yapıldı
- Ops dashboard (admin/ops) yeşil veya sarı; kırmızı ise canlıya çıkma

## 1. Altyapı
- Sunucu: Ubuntu 22.04, 4 vCPU / 8 GB RAM / 160 GB SSD (Hetzner CPX31 öneri)
- Güvenlik: UFW 22/80/443 açık; SSH key-only; fail2ban aktif
- Docker Compose: `infra/docker-compose.prod.yml`

## 2. Ortam Değişkenleri
- Zorunlu: `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL` (ops/presence), `STORAGE_BUCKET` (S3/R2 geçişi için), `SMTP_*` (opsiyon)
- Prod `.env`: `infra/.env.prod` içinde; repo’ya girmemeli

## 3. Nginx + SSL + Güvenlik
- Redirect: HTTP → HTTPS
- Rate limit: `limit_req zone=api_rate 10r/s burst=20 nodelay` (login 5r/s)
- Headers: `X-Content-Type-Options nosniff`, `X-Frame-Options SAMEORIGIN`, `Referrer-Policy strict-origin-when-cross-origin`, `Content-Security-Policy` (en az `default-src 'self' data: blob:`)
- Gzip açık; `client_max_body_size` 50M (upload ihtiyacına göre)

## 4. Deploy Adımları (Blue/Green yoksa)
1) `pnpm install --frozen-lockfile`
2) `pnpm --filter @atlasio/api prisma:generate`
3) `pnpm build` (root; web+api)
4) `docker compose --env-file infra/.env.prod -f infra/docker-compose.prod.yml up -d --build`
5) Health kontrol: `curl -f https://api.atlasio.tr/health`
6) Web smoke: `/`, `/login`, `/courses`
7) Ops smoke: `/admin/ops/health` (admin token) → status green/yellow

## 5. Veri Tabanı & Dosya
- Migration: `pnpm --filter @atlasio/api prisma:deploy`
- Yedekleme: günlük `pg_dump | gzip` → `/var/backups/atlasio` (14 gün sakla)
- Restore testi: ayda 1 kez `gunzip -c dump.sql.gz | psql $DATABASE_URL`
- Dosya: V1 local volume; V2 S3/R2 (signed URL). Backup: `aws s3 sync` veya R2 `rclone sync`.
- Sertifika verify code doldurma: `pnpm --filter @atlasio/api exec ts-node src/scripts/fill-verify-codes.ts` (tek seferlik/idempotent)

## 6. Ops & İzleme
- Ops collector 30s: CPU/RAM/Disk + req/min + avg latency + active users/streams
- Alarmlar: RAM ≥90, CPU ≥85, Disk ≥85, latency ≥1500ms → panel + e-posta
- Log: requestId header; ISO8601; logrotate günlük, 7 gün sakla
- PWA/Safe-area: `viewport-fit=cover`, `min-w-0`, `dvh` kullanımı doğrulandı

## 7. Geri Dönüş (Rollback)
- Sürüm tag’leri: `atlasio-api:vYYYYMMDD.N`, `atlasio-web:vYYYYMMDD.N`
- Geri alma: `docker compose ... pull` yerine eski tag’e `image:` pinleyip `up -d`
- Migration geri almayın; backward-compatible migration kuralı zorunlu (nullable ekle, silme iki aşamalı)

## 8. Olay Yönetimi (SEV)
- SEV1: sistem down / login yok → 5 dk içinde rollback veya kapasite yükselt
- SEV2: yüksek latency / canlı ders etkisi → scale workers, cache, rate limit düşür, alarm
- SEV3: tek modül sorunu → feature flag kapat, hotfix
- SEV4: kozmetik

### İlk 5 Dakika
- `/health` + Nginx hataları
- DB bağlantı / disk doluluk
- Son deploy? → rollback
- Trafik patlaması? → rate limit / WAF

## 9. Smoke List (Prod)
- API: `/health`, `/docs`
- Web: `/`, `/login`, `/courses`, bir kurs detayı
- Ops: `/admin/ops/health`, `/admin/ops/metrics/current`
- Sertifika: `/certificates/verify/<sample>`
- Upload: küçük dosya upload testi (assignment)

## 10. Checkpoint Sonrası
- Backup cron logu kontrolü
- Certbot yenileme logu
- Ops dashboard eğilim (24h) kaydedildi
- Incident log tutulduysa `docs/incidents/YYYY-MM-DD.md` ekle
