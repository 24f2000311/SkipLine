-- AlterTable
ALTER TABLE "Queue" ADD COLUMN     "agingIntervalSec" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "agingScoreStep" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "consecutiveVipCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxVipStreak" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "totalCallsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "QueueEntry" ADD COLUMN     "requeueAfterCallCount" INTEGER;
