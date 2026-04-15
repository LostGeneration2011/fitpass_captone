-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYPAL', 'MOMO', 'ZALOPAY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hourlyRate" DOUBLE PRECISION DEFAULT 250000;

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "credits" INTEGER NOT NULL,
    "validDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPackage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "creditsLeft" INTEGER NOT NULL,
    "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userPackageId" TEXT,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentId" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userPackageId" TEXT,
    "creditsUsed" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRecord" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "note" TEXT,
    "paidBy" TEXT,
    "paymentMethod" TEXT,
    "paymentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_userId_sessionId_key" ON "Booking"("userId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryRecord_teacherId_month_year_key" ON "SalaryRecord"("teacherId", "month", "year");

-- AddForeignKey
ALTER TABLE "UserPackage" ADD CONSTRAINT "UserPackage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPackage" ADD CONSTRAINT "UserPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userPackageId_fkey" FOREIGN KEY ("userPackageId") REFERENCES "UserPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userPackageId_fkey" FOREIGN KEY ("userPackageId") REFERENCES "UserPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRecord" ADD CONSTRAINT "SalaryRecord_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRecord" ADD CONSTRAINT "SalaryRecord_paidBy_fkey" FOREIGN KEY ("paidBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
