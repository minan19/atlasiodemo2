-- InstructorAction: tenantId support
ALTER TABLE "InstructorAction" ADD COLUMN IF NOT EXISTS "tenantId" text;
ALTER TABLE "InstructorAction" ALTER COLUMN "tenantId" DROP NOT NULL;
ALTER TABLE "InstructorAction" ALTER COLUMN "tenantId" SET DEFAULT 'public';
UPDATE "InstructorAction" SET "tenantId"='public' WHERE "tenantId" IS NULL;

CREATE INDEX IF NOT EXISTS "InstructorAction_tenantId_createdAt_idx"
ON "InstructorAction" ("tenantId", "createdAt");

-- Minimal Class table (needed by instructor-actions create validation)
CREATE TABLE IF NOT EXISTS "Class" (
  id text PRIMARY KEY,
  "tenantId" text NOT NULL DEFAULT 'public',
  name text NOT NULL DEFAULT 'Demo Class',
  "instructorId" text NOT NULL REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Class_tenantId_idx" ON "Class" ("tenantId");
CREATE INDEX IF NOT EXISTS "Class_instructorId_idx" ON "Class" ("instructorId");
