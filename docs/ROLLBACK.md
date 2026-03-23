# Atlasio Rollback Guide

## When to Roll Back
- API health endpoint fails after deploy.
- Critical auth flow (`/auth/login`, `/users/me`) breaks.
- Migration caused data or availability impact.

## App Rollback
1. Stop current API/Web release.
2. Deploy previous known-good artifacts.
3. Confirm:
   - `/health/ready` returns ready
   - `/courses/published` returns 200
   - login flow works

## Database Rollback
Prisma migrations are forward-first. Use one of:
- Restore DB snapshot from backup.
- Delete the affected rows from `instructor_payments` if the payroll batch needs to be reset, then re-run the payroll cron.
- Apply compensating migration (preferred for production integrity).

## Communication
- Record incident start/end time.
- Capture failed checks and root cause.
- Document permanent fix task in backlog.
