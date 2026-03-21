ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "courseId" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Class_courseId_fkey'
  ) THEN
    ALTER TABLE "Class"
      ADD CONSTRAINT "Class_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Class_courseId_idx" ON "Class" ("courseId");

DO $$
DECLARE cid text;
BEGIN
  SELECT id INTO cid FROM "Course" LIMIT 1;
  IF cid IS NOT NULL THEN
    UPDATE "Class" SET "courseId" = cid
    WHERE id='c1' AND "courseId" IS NULL;
  END IF;
END $$;
