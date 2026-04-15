/*
  Warnings:

  - The values [CANCELLED] on the enum `TransactionStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Enrollment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ClassType" AS ENUM ('YOGA', 'CARDIO', 'STRENGTH', 'DANCE', 'PILATES', 'OTHER');

-- CreateEnum
CREATE TYPE "ClassLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE', 'LOVE', 'WOW');

-- CreateEnum
CREATE TYPE "ChatThreadType" AS ENUM ('SUPPORT', 'CLASS');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'TRANSFERRED', 'COMPLETED', 'SUSPENDED');

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionStatus_new" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
ALTER TABLE "Transaction" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "status" TYPE "TransactionStatus_new" USING ("status"::text::"TransactionStatus_new");
ALTER TYPE "TransactionStatus" RENAME TO "TransactionStatus_old";
ALTER TYPE "TransactionStatus_new" RENAME TO "TransactionStatus";
DROP TYPE "TransactionStatus_old";
ALTER TABLE "Transaction" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "enrollmentId" TEXT;

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "level" "ClassLevel" NOT NULL DEFAULT 'ALL_LEVELS',
ADD COLUMN     "maxStudents" INTEGER,
ADD COLUMN     "minStudents" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "priceAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "type" "ClassType" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "lastNoteAt" TIMESTAMP(3),
ADD COLUMN     "notesUpdatedBy" TEXT,
ADD COLUMN     "progressNotes" TEXT,
ADD COLUMN     "refundAmount" DOUBLE PRECISION,
ADD COLUMN     "refundProcessed" BOOLEAN DEFAULT false,
ADD COLUMN     "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "transferredFrom" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "userPackageId" TEXT;

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "penaltyRate" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
ADD COLUMN     "refundRate" DOUBLE PRECISION NOT NULL DEFAULT 0.7;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "teacherBio" TEXT,
ADD COLUMN     "teacherCertifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teacherCoverImage" TEXT,
ADD COLUMN     "teacherExperienceYears" INTEGER,
ADD COLUMN     "teacherGalleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teacherHighlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teacherSpecialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserPackage" ADD COLUMN     "usedCredits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "type" "ChatThreadType" NOT NULL,
    "classId" TEXT,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT,
    "createdById" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "deletedByStudentAt" TIMESTAMP(3),
    "deletedByStudentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "UserRole" NOT NULL,
    "content" TEXT NOT NULL,
    "deletedByStudentAt" TIMESTAMP(3),
    "deletedByStudentId" TEXT,
    "deletedByAdminAt" TIMESTAMP(3),
    "deletedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassImage" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassReview" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderationReason" TEXT,
    "replyText" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassReaction" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ForumComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReaction" (
    "id" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumMedia" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "postId" TEXT NOT NULL,

    CONSTRAINT "ForumMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatThread_studentId_idx" ON "ChatThread"("studentId");

-- CreateIndex
CREATE INDEX "ChatThread_teacherId_idx" ON "ChatThread"("teacherId");

-- CreateIndex
CREATE INDEX "ChatThread_classId_idx" ON "ChatThread"("classId");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassImage_classId_order_idx" ON "ClassImage"("classId", "order");

-- CreateIndex
CREATE INDEX "ClassReview_classId_idx" ON "ClassReview"("classId");

-- CreateIndex
CREATE INDEX "ClassReview_classId_isHidden_idx" ON "ClassReview"("classId", "isHidden");

-- CreateIndex
CREATE UNIQUE INDEX "ClassReview_classId_studentId_key" ON "ClassReview"("classId", "studentId");

-- CreateIndex
CREATE INDEX "ClassReaction_classId_type_idx" ON "ClassReaction"("classId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ClassReaction_classId_studentId_key" ON "ClassReaction"("classId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumReaction_userId_postId_type_key" ON "ForumReaction"("userId", "postId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassImage" ADD CONSTRAINT "ClassImage_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReview" ADD CONSTRAINT "ClassReview_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReview" ADD CONSTRAINT "ClassReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReaction" ADD CONSTRAINT "ClassReaction_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassReaction" ADD CONSTRAINT "ClassReaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userPackageId_fkey" FOREIGN KEY ("userPackageId") REFERENCES "UserPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumMedia" ADD CONSTRAINT "ForumMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
