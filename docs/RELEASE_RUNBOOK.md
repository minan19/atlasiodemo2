# Atlasio Release Runbook

## Preconditions
- `pnpm install` completed.
- Infra is up: `docker compose -f infra/docker-compose.yml up -d`.
- Root `.env` exists and production secrets are set.

## Verification Gate
Run all quality checks before tagging:

```bash
pnpm --filter @atlasio/api prisma:generate
pnpm --filter @atlasio/api test
pnpm typecheck
pnpm --filter @atlasio/web lint
pnpm build
```

## Database
Apply schema changes:

```bash
pnpm --filter @atlasio/api prisma:deploy
```

Seed only in non-production:

```bash
pnpm db:seed
```

## Deploy Sequence
1. Build and run prod stack:

```bash
cp infra/.env.prod.example infra/.env.prod
docker compose --env-file infra/.env.prod -f infra/docker-compose.prod.yml up -d --build
```

2. Validate API health: `GET /health/ready`.
3. Validate web root and `/courses`.
4. Run smoke test:

```bash
BASE_URL=https://your-domain.com pnpm smoke:prod
```

5. SMTP probe (optional but recommended):

```bash
SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... SMTP_TO=... pnpm smtp:probe
```
4. Smoke check:
   - `/`
   - `/login`
   - `/courses`
   - API `/api/docs`
   - API `/api/ops/metrics` (admin token)

## Post-Deploy Checks
- Verify scheduled automation tick logs (`automation.tick` audit entries).
- Confirm report exports (`pdf/xlsx/docx`) work.
- Check `/health` and `/health/ready` return `ok/ready`.
- Confirm nightly value score telemetry by hitting `/volunteer-contents/admin/:instructorId/score` (or `scores`) and ensure automation log contains `instructorValueScore.record`.
- Query `/instructor-payments/admin/<instructorId>/history` and ensure at least the latest batch is present (admin token).
- Verify automation logs contain `instructorPayment.generate` entries after the 03:00 payroll run.
- Ensure pending payouts can be marked as paid via `PATCH /instructor-payments/admin/:paymentId/pay` during QA.

## TLS Enablement (Let's Encrypt)
After DNS is pointed to the server:

```bash
docker compose --env-file infra/.env.prod -f infra/docker-compose.prod.yml -f infra/docker-compose.prod.tls.yml up -d --build
docker compose --env-file infra/.env.prod -f infra/docker-compose.prod.yml -f infra/docker-compose.prod.tls.yml run --rm certbot
docker compose --env-file infra/.env.prod -f infra/docker-compose.prod.yml -f infra/docker-compose.prod.tls.yml restart nginx
```
