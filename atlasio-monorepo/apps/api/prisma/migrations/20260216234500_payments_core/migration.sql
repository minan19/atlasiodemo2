-- Payment core: PricePlan, PaymentIntent, Subscription, PaymentStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'REFUNDED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "PricePlan" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "interval" TEXT,
  "courseId" TEXT,
  "features" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PaymentIntent" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "userId" TEXT,
  "tenantId" TEXT,
  "courseId" TEXT,
  "planId" TEXT,
  "seats" INTEGER,
  "installments" INTEGER,
  "metadata" JSONB,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "seats" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "provider" TEXT NOT NULL,
  "providerSubscriptionId" TEXT,
  "currentPeriodEnd" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS "PaymentIntent_userId_status_idx" ON "PaymentIntent"("userId","status");
CREATE INDEX IF NOT EXISTS "PaymentIntent_tenantId_idx" ON "PaymentIntent"("tenantId");
CREATE INDEX IF NOT EXISTS "Subscription_tenantId_status_idx" ON "Subscription"("tenantId","status");
CREATE INDEX IF NOT EXISTS "Subscription_planId_idx" ON "Subscription"("planId");

-- FKs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentIntent_userId_fkey') THEN
    ALTER TABLE "PaymentIntent"
      ADD CONSTRAINT "PaymentIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentIntent_courseId_fkey') THEN
    ALTER TABLE "PaymentIntent"
      ADD CONSTRAINT "PaymentIntent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentIntent_planId_fkey') THEN
    ALTER TABLE "PaymentIntent"
      ADD CONSTRAINT "PaymentIntent_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_planId_fkey') THEN
    ALTER TABLE "Subscription"
      ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
