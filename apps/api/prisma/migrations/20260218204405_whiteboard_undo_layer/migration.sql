-- AlterTable
ALTER TABLE "WhiteboardAction" ADD COLUMN     "layerId" TEXT DEFAULT 'default',
ADD COLUMN     "reverted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetActionId" TEXT;

-- CreateIndex
CREATE INDEX "WhiteboardAction_targetActionId_idx" ON "WhiteboardAction"("targetActionId");
