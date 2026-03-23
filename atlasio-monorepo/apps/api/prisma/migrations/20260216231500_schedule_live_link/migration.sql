-- Link course schedules to live sessions (optional)
ALTER TABLE "CourseSchedule" ADD COLUMN IF NOT EXISTS "liveSessionId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CourseSchedule_liveSessionId_fkey'
  ) THEN
    ALTER TABLE "CourseSchedule"
      ADD CONSTRAINT "CourseSchedule_liveSessionId_fkey"
      FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
