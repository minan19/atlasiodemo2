/*
  Warnings:

  - Changed the type of `role` on the `CommunicationMessage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `content` on table `CommunicationMessage` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SecurityEventSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SecurityEventStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'MITIGATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DefenseActionType" AS ENUM ('RATE_LIMIT', 'WAF_RULE', 'QUARANTINE', 'RESTART_SERVICE', 'BLOCK_IDENTITY', 'ALERT_ONLY');

-- CreateEnum
CREATE TYPE "DefenseActionState" AS ENUM ('PROPOSED', 'APPROVED', 'APPLIED', 'ROLLED_BACK', 'FAILED');

-- AlterTable
ALTER TABLE "CommunicationMessage" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL,
ALTER COLUMN "content" SET NOT NULL;

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT DEFAULT 'public',
    "source" TEXT NOT NULL,
    "category" TEXT,
    "eventType" TEXT,
    "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "SecurityEventStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "actorIp" TEXT,
    "userAgent" TEXT,
    "payload" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefenseAction" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "actionType" "DefenseActionType" NOT NULL,
    "target" TEXT,
    "params" JSONB,
    "state" "DefenseActionState" NOT NULL DEFAULT 'PROPOSED',
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),

    CONSTRAINT "DefenseAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_detectedAt_idx" ON "SecurityEvent"("severity", "detectedAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_status_detectedAt_idx" ON "SecurityEvent"("status", "detectedAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_tenantId_idx" ON "SecurityEvent"("tenantId");

-- CreateIndex
CREATE INDEX "DefenseAction_eventId_idx" ON "DefenseAction"("eventId");

-- CreateIndex
CREATE INDEX "DefenseAction_actionType_state_idx" ON "DefenseAction"("actionType", "state");

-- CreateIndex
CREATE INDEX "ExamSession_userId_courseId_idx" ON "ExamSession"("userId", "courseId");

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseAction" ADD CONSTRAINT "DefenseAction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
