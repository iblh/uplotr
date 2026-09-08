-- uplotr 0.3.1: test protocols and imported drone flights.
ALTER TABLE "field_test_runs"
ADD COLUMN "activityType" TEXT NOT NULL DEFAULT 'GROUND',
ADD COLUMN "sourceFormat" TEXT,
ADD COLUMN "expectedIntervalSeconds" INTEGER,
ADD COLUMN "minSamples" INTEGER NOT NULL DEFAULT 2;

CREATE INDEX "field_test_runs_activityType_idx"
ON "field_test_runs"("activityType");
