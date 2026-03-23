-- Add StreamMetric table for playback/live telemetry
CREATE TABLE "StreamMetric" (
  "id" text PRIMARY KEY,
  "userId" text NULL,
  "courseId" text NULL,
  "lessonId" text NULL,
  "liveSessionId" text NULL,
  "watchSeconds" integer NOT NULL DEFAULT 0,
  "rebufferCount" integer NOT NULL DEFAULT 0,
  "avgBitrateKbps" integer NULL,
  "droppedFrames" integer NULL,
  "device" jsonb NULL,
  "network" jsonb NULL,
  "tenantId" text NOT NULL DEFAULT 'public',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "StreamMetric_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "StreamMetric_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "StreamMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "StreamMetric_courseId_idx" ON "StreamMetric"("courseId");
CREATE INDEX "StreamMetric_lessonId_idx" ON "StreamMetric"("lessonId");
CREATE INDEX "StreamMetric_createdAt_idx" ON "StreamMetric"("createdAt");
CREATE INDEX "StreamMetric_liveSessionId_idx" ON "StreamMetric"("liveSessionId");
