-- CreateTable
CREATE TABLE "WhiteboardLayer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhiteboardLayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhiteboardLayer_sessionId_idx" ON "WhiteboardLayer"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "WhiteboardLayer_sessionId_name_key" ON "WhiteboardLayer"("sessionId", "name");

-- AddForeignKey
ALTER TABLE "WhiteboardLayer" ADD CONSTRAINT "WhiteboardLayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhiteboardSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardLayer" ADD CONSTRAINT "WhiteboardLayer_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
