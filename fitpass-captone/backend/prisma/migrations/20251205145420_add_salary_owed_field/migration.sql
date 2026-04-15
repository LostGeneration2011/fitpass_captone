/*
  Warnings:

  - You are about to drop the `SessionPayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SessionPayment" DROP CONSTRAINT "SessionPayment_paidBy_fkey";

-- DropForeignKey
ALTER TABLE "SessionPayment" DROP CONSTRAINT "SessionPayment_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "SessionPayment" DROP CONSTRAINT "SessionPayment_teacherId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "salaryOwed" DOUBLE PRECISION DEFAULT 0;

-- DropTable
DROP TABLE "SessionPayment";
