-- CreateTable
CREATE TABLE "device_events" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "device_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_events_deviceId_idx" ON "device_events"("deviceId");

-- CreateIndex
CREATE INDEX "device_events_ts_idx" ON "device_events"("ts");

-- AddForeignKey
ALTER TABLE "device_events" ADD CONSTRAINT "device_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
