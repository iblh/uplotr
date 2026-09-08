-- uplotr 0.3: field-test runs and arbitrary telemetry metrics.
ALTER TABLE "positions"
ADD COLUMN "metrics" JSONB,
ADD COLUMN "runId" TEXT;

CREATE TABLE "field_test_runs" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "hardwareVersion" TEXT,
    "firmwareVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_test_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "field_test_runs_deviceId_startedAt_idx"
ON "field_test_runs"("deviceId", "startedAt");

CREATE INDEX "field_test_runs_status_idx"
ON "field_test_runs"("status");

CREATE UNIQUE INDEX "field_test_runs_one_active_per_device"
ON "field_test_runs"("deviceId") WHERE "status" = 'ACTIVE';

CREATE INDEX "positions_runId_ts_idx" ON "positions"("runId", "ts");

ALTER TABLE "field_test_runs"
ADD CONSTRAINT "field_test_runs_deviceId_fkey"
FOREIGN KEY ("deviceId") REFERENCES "devices"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "positions"
ADD CONSTRAINT "positions_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "field_test_runs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
