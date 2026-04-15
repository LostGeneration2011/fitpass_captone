-- CreateTable
CREATE TABLE "SessionPayment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "paidDate" TIMESTAMP(3),
    "paidBy" TEXT,
    "paymentMethod" TEXT,
    "paymentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionPayment_sessionId_key" ON "SessionPayment"("sessionId");

-- AddForeignKey
ALTER TABLE "SessionPayment" ADD CONSTRAINT "SessionPayment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPayment" ADD CONSTRAINT "SessionPayment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPayment" ADD CONSTRAINT "SessionPayment_paidBy_fkey" FOREIGN KEY ("paidBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
