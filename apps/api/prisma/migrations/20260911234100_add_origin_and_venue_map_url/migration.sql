-- CreateEnum
CREATE TYPE "EntryOrigin" AS ENUM ('QR', 'WALK_IN');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "venueMapUrl" TEXT;

-- AlterTable
ALTER TABLE "QueueEntry" ADD COLUMN "origin" "EntryOrigin" NOT NULL DEFAULT 'QR';
