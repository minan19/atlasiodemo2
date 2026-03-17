# Atlasio Operations

## Health and Observability
- `GET /health` basic liveness.
- `GET /health/ready` readiness + DB query.
- `GET /ops/metrics` admin-only operational metrics:
  - request count
  - p50 / p95 latency
  - active users (last 15m from login audit)
  - course totals

## Request Correlation
- API assigns `x-request-id` when client does not send one.
- Every response returns `x-request-id`.

## Scheduled Maintenance
`AutomationService` runs every minute:
- dispatches due scheduled reports
- marks expired certifications
- writes `automation.tick` into audit log

Every day at `03:00` a dedicated payroll cron collects completed enrollments, course revenues,
discounts refund impacts and populates `instructor-payments`. Audit entries `instructorPayment.generate`
ve `instructorPayment.markPaid` log the lifecycle. Key endpoints:
- `GET /instructor-payments/me/summary`
- `GET /instructor-payments/me/history`
- `GET /instructor-payments/admin/:instructorId/(summary|history)`
- `POST /instructor-payments/admin/:instructorId/generate`
- `PATCH /instructor-payments/admin/:paymentId/pay` (admin only)

## Scheduled Report Email Delivery
- If SMTP env vars are configured, scheduled reports are sent to recipients as attachments.
- If SMTP is missing, dispatch is skipped safely and logged as `report.schedule.dispatch.skipped`.
- Required SMTP envs:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - optional: `SMTP_SECURE`, `SMTP_FROM`

## Incident Triage
1. Check `/health/ready`.
2. Check latest audit events (`automation.tick`, `report.schedule.dispatch`).
3. Verify DB connectivity and Redis availability.
4. Use rollback plan if critical paths fail.

## Volunteer Content Oversight
- Volunteers’ submissions hit `POST /volunteer-contents` and show up in `GET /volunteer-contents/admin`.
- Admins approve/reject via `PATCH /volunteer-contents/:id/status`; approvals trigger contributor value score tracking every night at 04:00 (`automation.refreshValueScores` logs `instructorValueScore.record`).
- Key metrics: `GET /volunteer-contents/me/score` (instructor), `GET /volunteer-contents/admin/:instructorId/score`, `GET /volunteer-contents/admin/:instructorId/scores` (historical).
