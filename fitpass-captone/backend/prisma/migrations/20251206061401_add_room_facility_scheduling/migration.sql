-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "roomId" TEXT;

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER NOT NULL,
    "equipment" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
