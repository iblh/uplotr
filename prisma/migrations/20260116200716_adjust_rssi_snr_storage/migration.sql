/*
  Warnings:

  - You are about to drop the column `rssi` on the `device_events` table. All the data in the column will be lost.
  - You are about to drop the column `snr` on the `device_events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "device_events" DROP COLUMN "rssi",
DROP COLUMN "snr";
