-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "ClassStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationToken" TEXT;
