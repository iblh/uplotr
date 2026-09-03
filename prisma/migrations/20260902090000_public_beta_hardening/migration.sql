-- Preserve legacy API key values during the public beta migration window.
ALTER TABLE "api_keys"
ADD COLUMN "keyHash" TEXT,
ADD COLUMN "prefix" TEXT,
ADD COLUMN "lastUsedAt" TIMESTAMP(3);

-- New keys never persist their secret. This legacy column stays nullable until
-- a later migration removes it after all installations have upgraded.
ALTER TABLE "api_keys" ALTER COLUMN "key" DROP NOT NULL;

CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

CREATE TABLE "rate_limit_buckets" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "rate_limit_buckets_expiresAt_idx" ON "rate_limit_buckets"("expiresAt");
CREATE INDEX "devices_lastSeen_idx" ON "devices"("lastSeen");
CREATE INDEX "positions_deviceId_ts_idx" ON "positions"("deviceId", "ts");
CREATE INDEX "device_events_deviceId_ts_idx" ON "device_events"("deviceId", "ts");

ALTER TABLE "positions" DROP CONSTRAINT "positions_deviceId_fkey";
ALTER TABLE "device_events" DROP CONSTRAINT "device_events_deviceId_fkey";
ALTER TABLE "positions" ADD CONSTRAINT "positions_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_events" ADD CONSTRAINT "device_events_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
