-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "mapperId" TEXT;

-- CreateTable
CREATE TABLE "payload_mappers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetType" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT true,
    "latPath" TEXT NOT NULL,
    "lonPath" TEXT NOT NULL,
    "tsPath" TEXT,
    "batteryPath" TEXT,
    "tempPath" TEXT,
    "lightPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payload_mappers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_mapperId_fkey" FOREIGN KEY ("mapperId") REFERENCES "payload_mappers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
