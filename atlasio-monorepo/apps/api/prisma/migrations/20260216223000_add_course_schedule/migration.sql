-- Minimal delta migration: course schedules + missing columns/constraints
-- Prereq: pgvector extension is optional here (handled elsewhere if needed).

-- 1) Course columns (idempotent)
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "instructorId" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "price" DECIMAL(65,30) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Course_instructorId_fkey'
  ) THEN
    ALTER TABLE "Course"
      ADD CONSTRAINT "Course_instructorId_fkey"
      FOREIGN KEY ("instructorId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- 1b) Enrollment columns (idempotent)
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);

-- 2) Certification columns/uniques (idempotent)
ALTER TABLE "Certification" ADD COLUMN IF NOT EXISTS "examSessionId" TEXT;
ALTER TABLE "Certification" ADD COLUMN IF NOT EXISTS "verifyCode" TEXT;
ALTER TABLE "Certification" ADD COLUMN IF NOT EXISTS "blockchainStatus" TEXT;
ALTER TABLE "Certification" ADD COLUMN IF NOT EXISTS "sbtTokenId" TEXT;

-- Ensure ExamSession table exists (for FK)
CREATE TABLE IF NOT EXISTS "ExamSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "deviceInfo" JSONB,
  "trustScore" DOUBLE PRECISION,
  "aiDecision" TEXT,
  "proctorNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Certification_examSessionId_fkey'
  ) THEN
    ALTER TABLE "Certification"
      ADD CONSTRAINT "Certification_examSessionId_fkey"
      FOREIGN KEY ("examSessionId") REFERENCES "ExamSession"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Certification_examSessionId_key'
  ) THEN
    ALTER TABLE "Certification"
      ADD CONSTRAINT "Certification_examSessionId_key" UNIQUE ("examSessionId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Certification_verifyCode_key'
  ) THEN
    ALTER TABLE "Certification"
      ADD CONSTRAINT "Certification_verifyCode_key" UNIQUE ("verifyCode");
  END IF;
END$$;

-- 3) CourseSchedule table
CREATE TABLE IF NOT EXISTS "CourseSchedule" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT,
  "location" TEXT,
  "meetingUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CourseSchedule_courseId_startAt_idx" ON "CourseSchedule"("courseId","startAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CourseSchedule_courseId_fkey'
  ) THEN
    ALTER TABLE "CourseSchedule"
      ADD CONSTRAINT "CourseSchedule_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- 4) Enrollment convenience indexes (if missing)
CREATE INDEX IF NOT EXISTS "Enrollment_completedAt_idx" ON "Enrollment"("completedAt");
CREATE INDEX IF NOT EXISTS "Enrollment_refundedAt_idx" ON "Enrollment"("refundedAt");

-- 5) Live / Whiteboard core (enums + tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LiveSessionStatus') THEN
    CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'PAUSED', 'ENDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PresentationStatus') THEN
    CREATE TYPE "PresentationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageType') THEN
    CREATE TYPE "MessageType" AS ENUM ('CHAT', 'ASSIGNMENT');
  END IF;
END$$;

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

CREATE INDEX IF NOT EXISTS "LiveSession_courseId_status_idx" ON "LiveSession"("courseId","status");

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
CREATE INDEX IF NOT EXISTS "LiveSessionParticipant_sessionId_idx" ON "LiveSessionParticipant"("sessionId");

CREATE TABLE IF NOT EXISTS "WhiteboardSession" (
  "id" TEXT NOT NULL,
  "liveSessionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhiteboardSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhiteboardSession_liveSessionId_key" UNIQUE ("liveSessionId")
);

CREATE TABLE IF NOT EXISTS "WhiteboardAction" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "socketId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhiteboardAction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WhiteboardAction_sessionId_createdAt_idx" ON "WhiteboardAction"("sessionId","createdAt");

CREATE TABLE IF NOT EXISTS "PresentationRequest" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "status" "PresentationStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "notes" TEXT,
  CONSTRAINT "PresentationRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PresentationRequest_sessionId_status_idx" ON "PresentationRequest"("sessionId","status");

CREATE TABLE IF NOT EXISTS "CommunicationMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "type" "MessageType" NOT NULL DEFAULT 'CHAT',
  "content" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommunicationMessage_sessionId_createdAt_idx" ON "CommunicationMessage"("sessionId","createdAt");

-- Live / whiteboard FKs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveSession_courseId_fkey') THEN
    ALTER TABLE "LiveSession"
      ADD CONSTRAINT "LiveSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveSession_instructorId_fkey') THEN
    ALTER TABLE "LiveSession"
      ADD CONSTRAINT "LiveSession_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveSessionParticipant_sessionId_fkey') THEN
    ALTER TABLE "LiveSessionParticipant"
      ADD CONSTRAINT "LiveSessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveSessionParticipant_userId_fkey') THEN
    ALTER TABLE "LiveSessionParticipant"
      ADD CONSTRAINT "LiveSessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveSessionParticipant_sessionId_userId_key') THEN
    ALTER TABLE "LiveSessionParticipant"
      ADD CONSTRAINT "LiveSessionParticipant_sessionId_userId_key" UNIQUE ("sessionId","userId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WhiteboardSession_liveSessionId_fkey') THEN
    ALTER TABLE "WhiteboardSession"
      ADD CONSTRAINT "WhiteboardSession_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WhiteboardAction_sessionId_fkey') THEN
    ALTER TABLE "WhiteboardAction"
      ADD CONSTRAINT "WhiteboardAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhiteboardSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WhiteboardAction_userId_fkey') THEN
    ALTER TABLE "WhiteboardAction"
      ADD CONSTRAINT "WhiteboardAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresentationRequest_sessionId_fkey') THEN
    ALTER TABLE "PresentationRequest"
      ADD CONSTRAINT "PresentationRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresentationRequest_requesterId_fkey') THEN
    ALTER TABLE "PresentationRequest"
      ADD CONSTRAINT "PresentationRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunicationMessage_sessionId_fkey') THEN
    ALTER TABLE "CommunicationMessage"
      ADD CONSTRAINT "CommunicationMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunicationMessage_senderId_fkey') THEN
    ALTER TABLE "CommunicationMessage"
      ADD CONSTRAINT "CommunicationMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
