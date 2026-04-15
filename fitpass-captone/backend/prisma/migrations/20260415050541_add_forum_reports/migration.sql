-- AlterTable
ALTER TABLE "ForumComment" ADD COLUMN     "reports" JSONB[];

-- AlterTable
ALTER TABLE "ForumPost" ADD COLUMN     "reports" JSONB[];
