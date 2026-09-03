/*
  Warnings:

  - A unique constraint covering the columns `[devEui]` on the table `devices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "devEui" TEXT,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "source" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "devices_devEui_key" ON "devices"("devEui");
