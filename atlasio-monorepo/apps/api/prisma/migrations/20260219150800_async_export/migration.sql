-- AsyncExport table for queued/instant exports
CREATE TABLE "AsyncExport" (
  "id" text PRIMARY KEY,
  "type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'PROCESSING',
  "filePath" text NULL,
  "actorId" text NULL,
  "tenantId" text NOT NULL DEFAULT 'public',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AsyncExport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "AsyncExport_tenantId_createdAt_idx" ON "AsyncExport"("tenantId", "createdAt");
