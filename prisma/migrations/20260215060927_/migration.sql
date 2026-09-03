/*
  Warnings:

  - You are about to drop the column `devEui` on the `devices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalId]` on the table `devices` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "devices_devEui_key";

-- AlterTable
ALTER TABLE "devices" DROP COLUMN "devEui",
ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "payload_mappers" ADD COLUMN     "rssiPath" TEXT,
ADD COLUMN     "snrPath" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "devices_externalId_key" ON "devices"("externalId");
