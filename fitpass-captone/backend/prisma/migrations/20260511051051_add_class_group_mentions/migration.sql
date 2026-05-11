-- CreateEnum
CREATE TYPE "ForumModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "ChatThreadType" ADD VALUE 'CLASS_GROUP';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "mentionedUserIds" JSONB,
ADD COLUMN     "replyToId" TEXT;

-- AlterTable
ALTER TABLE "ForumPost" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderationNote" TEXT,
ADD COLUMN     "moderationStatus" "ForumModerationStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
