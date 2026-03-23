/*
  Warnings:

  - You are about to drop the column `kind` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `liveRoomId` on the `Lesson` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[courseId,order]` on the table `Lesson` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "kind",
DROP COLUMN "liveRoomId",
ADD COLUMN     "content" TEXT,
ADD COLUMN     "isPreview" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Lesson_courseId_idx" ON "Lesson"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_courseId_order_key" ON "Lesson"("courseId", "order");
