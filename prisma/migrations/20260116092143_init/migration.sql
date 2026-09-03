-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "lastLat" DOUBLE PRECISION,
    "lastLon" DOUBLE PRECISION,
    "lastBattery" INTEGER,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "battery" INTEGER,
    "temp" DOUBLE PRECISION,
    "light" DOUBLE PRECISION,
    "raw" JSONB,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "positions_deviceId_idx" ON "positions"("deviceId");

-- CreateIndex
CREATE INDEX "positions_ts_idx" ON "positions"("ts");

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
