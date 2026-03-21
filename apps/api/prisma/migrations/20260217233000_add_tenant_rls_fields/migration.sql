-- Add tenantId to Course and Enrollment for RLS preparation
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "tenantId" text NOT NULL DEFAULT 'public';
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "tenantId" text NOT NULL DEFAULT 'public';

-- Backfill existing rows to default
UPDATE "Course" SET "tenantId" = 'public' WHERE "tenantId" IS NULL;
UPDATE "Enrollment" SET "tenantId" = 'public' WHERE "tenantId" IS NULL;

-- Indexes to speed tenant scoping
CREATE INDEX IF NOT EXISTS "Course_tenantId_idx" ON "Course"("tenantId");
CREATE INDEX IF NOT EXISTS "Enrollment_tenantId_idx" ON "Enrollment"("tenantId");
