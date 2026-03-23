-- Ensure enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LiveSessionStatus') THEN
    CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'PAUSED', 'ENDED');
  END IF;
END$$;

-- Ensure tables
CREATE TABLE IF NOT EXISTS "LiveSession" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "topic" TEXT,
  "status" "LiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "isRecording" BOOLEAN NOT NULL DEFAULT false,
  "activeSpeakerId" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LiveSessionParticipant" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "micOn" BOOLEAN NOT NULL DEFAULT false,
  "cameraOn" BOOLEAN NOT NULL DEFAULT false,
  "screenShare" BOOLEAN NOT NULL DEFAULT false,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveSessionParticipant_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveSessionParticipant_sessionId_fkey') THEN
    ALTER TABLE "LiveSessionParticipant"
      ADD CONSTRAINT "LiveSessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveSessionParticipant_userId_fkey') THEN
    ALTER TABLE "LiveSessionParticipant"
      ADD CONSTRAINT "LiveSessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LiveSessionParticipant_sessionId_userId_key'
  ) THEN
    ALTER TABLE "LiveSessionParticipant"
      ADD CONSTRAINT "LiveSessionParticipant_sessionId_userId_key"
      UNIQUE ("sessionId", "userId");
  END IF;
END$$;
