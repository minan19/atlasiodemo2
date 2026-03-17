-- CreateEnum
CREATE TYPE "VolunteerContentStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InstructorPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'PENDING_ROTATION');

-- CreateEnum
CREATE TYPE "LearningEventType" AS ENUM ('CONTENT_VIEWED', 'VIDEO_DROPOFF', 'QUIZ_ANSWERED', 'ASSIGNMENT_SUBMITTED', 'LIVE_JOIN', 'LIVE_CHAT', 'GRADE_POSTED', 'CALIPER_EVENT');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('STUDENT_NEXT_STEP', 'MICRO_CONTENT', 'RISK_ALERT', 'CONTENT_REVISION', 'INSTRUCTOR_INSIGHT');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- DropIndex
DROP INDEX "Course_tenantId_idx";

-- DropIndex
DROP INDEX "Enrollment_tenantId_idx";

-- AlterTable
ALTER TABLE "LiveSession" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LiveSessionParticipant" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- Seed default tenant used by existing data and dev RLS
INSERT INTO "Tenant" ("id","name","slug","status","updatedAt")
VALUES ('public','Default','public','active', NOW())
ON CONFLICT ("id") DO NOTHING;

-- CreateTable
CREATE TABLE "AiProctoringResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eyeScore" DOUBLE PRECISION,
    "headScore" DOUBLE PRECISION,
    "audioScore" DOUBLE PRECISION,
    "tabSwitches" INTEGER,
    "objectFlags" INTEGER,
    "finalTrustScore" DOUBLE PRECISION,
    "aiRecommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiProctoringResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricHash" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "faceHash" TEXT,
    "voiceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricHash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CognitiveLoad" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "attentionScore" DOUBLE PRECISION,
    "confusionIndex" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CognitiveLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorPayoutProfile" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "level" TEXT,
    "baseFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "perEnrollmentFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "revenueShare" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorPayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorPayment" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "completedEnrollments" INTEGER NOT NULL,
    "refundCount" INTEGER NOT NULL,
    "courseRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "details" JSONB,
    "notes" TEXT,
    "status" "InstructorPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "InstructorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerContent" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resourceUrl" TEXT,
    "contentType" TEXT,
    "status" "VolunteerContentStatus" NOT NULL DEFAULT 'PENDING',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerContentFeedback" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerContentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorValueScore" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "approvedContents" INTEGER NOT NULL DEFAULT 0,
    "feedbackCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "score" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,

    CONSTRAINT "InstructorValueScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LtiTool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LtiTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LtiDeployment" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "instructors" TEXT[],
    "learners" TEXT[],
    "status" "DeploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "keyRotation" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LtiDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LtiLaunch" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LtiLaunch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "contextMap" JSONB NOT NULL DEFAULT '{}',
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "AiAgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentLog" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAgentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" "Role",
    "context" TEXT,
    "metrics" JSONB NOT NULL,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "LearningEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "userCount" INTEGER NOT NULL,
    "vertical" TEXT,
    "status" TEXT NOT NULL DEFAULT 'prospect',
    "lastContact" TIMESTAMP(3) NOT NULL,
    "score" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePerUser" DECIMAL(65,30) NOT NULL,
    "minUsers" INTEGER NOT NULL DEFAULT 1,
    "maxUsers" INTEGER,
    "moduleSupport" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "confidence" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "RecommendationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "explainedBy" TEXT,
    "modelVersion" TEXT,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMetric" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT,
    "value" DECIMAL(65,30) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnector" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "AiProctoringResult_sessionId_createdAt_idx" ON "AiProctoringResult"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "BiometricHash_userId_idx" ON "BiometricHash"("userId");

-- CreateIndex
CREATE INDEX "CognitiveLoad_userId_lessonId_recordedAt_idx" ON "CognitiveLoad"("userId", "lessonId", "recordedAt");

-- CreateIndex
CREATE INDEX "InstructorPayoutProfile_instructorId_idx" ON "InstructorPayoutProfile"("instructorId");

-- CreateIndex
CREATE INDEX "InstructorPayment_instructorId_status_idx" ON "InstructorPayment"("instructorId", "status");

-- CreateIndex
CREATE INDEX "InstructorPayment_periodStart_periodEnd_idx" ON "InstructorPayment"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorPayment_instructorId_periodStart_periodEnd_key" ON "InstructorPayment"("instructorId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "VolunteerContentFeedback_contentId_idx" ON "VolunteerContentFeedback"("contentId");

-- CreateIndex
CREATE INDEX "VolunteerContentFeedback_userId_idx" ON "VolunteerContentFeedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerContentFeedback_contentId_userId_key" ON "VolunteerContentFeedback"("contentId", "userId");

-- CreateIndex
CREATE INDEX "InstructorValueScore_instructorId_idx" ON "InstructorValueScore"("instructorId");

-- CreateIndex
CREATE INDEX "InstructorValueScore_computedAt_idx" ON "InstructorValueScore"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LtiTool_clientId_key" ON "LtiTool"("clientId");

-- CreateIndex
CREATE INDEX "PerformanceSnapshot_role_idx" ON "PerformanceSnapshot"("role");

-- CreateIndex
CREATE INDEX "PerformanceSnapshot_recordedAt_idx" ON "PerformanceSnapshot"("recordedAt");

-- CreateIndex
CREATE INDEX "LearningEvent_tenantId_eventType_idx" ON "LearningEvent"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "LearningEvent_userId_idx" ON "LearningEvent"("userId");

-- CreateIndex
CREATE INDEX "CustomerSignal_tenantId_status_idx" ON "CustomerSignal"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CustomerSignal_tenantId_score_idx" ON "CustomerSignal"("tenantId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_tenantId_name_key" ON "PricingRule"("tenantId", "name");

-- CreateIndex
CREATE INDEX "AIMetric_tenantId_name_idx" ON "AIMetric"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnector_tenantId_name_key" ON "IntegrationConnector"("tenantId", "name");

-- Ensure existing data has a valid tenant before enforcing FKs
UPDATE "Course" SET "tenantId" = 'public' WHERE "tenantId" IS NULL;
UPDATE "Enrollment" SET "tenantId" = 'public' WHERE "tenantId" IS NULL;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiProctoringResult" ADD CONSTRAINT "AiProctoringResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricHash" ADD CONSTRAINT "BiometricHash_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitiveLoad" ADD CONSTRAINT "CognitiveLoad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitiveLoad" ADD CONSTRAINT "CognitiveLoad_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorPayoutProfile" ADD CONSTRAINT "InstructorPayoutProfile_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorPayment" ADD CONSTRAINT "InstructorPayment_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorPayment" ADD CONSTRAINT "InstructorPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerContent" ADD CONSTRAINT "VolunteerContent_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerContent" ADD CONSTRAINT "VolunteerContent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerContent" ADD CONSTRAINT "VolunteerContent_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerContentFeedback" ADD CONSTRAINT "VolunteerContentFeedback_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "VolunteerContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerContentFeedback" ADD CONSTRAINT "VolunteerContentFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorValueScore" ADD CONSTRAINT "InstructorValueScore_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorValueScore" ADD CONSTRAINT "InstructorValueScore_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtiDeployment" ADD CONSTRAINT "LtiDeployment_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "LtiTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtiDeployment" ADD CONSTRAINT "LtiDeployment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtiLaunch" ADD CONSTRAINT "LtiLaunch_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "LtiDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentLog" ADD CONSTRAINT "AiAgentLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSignal" ADD CONSTRAINT "CustomerSignal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingProposal" ADD CONSTRAINT "PricingProposal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMetric" ADD CONSTRAINT "AIMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnector" ADD CONSTRAINT "IntegrationConnector_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
