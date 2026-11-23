ALTER TABLE "auth_session"
ADD COLUMN "correlation_id" TEXT,
ADD COLUMN "access_grant_id" UUID,
ADD COLUMN "device_reported_at" TIMESTAMP(3),
ADD COLUMN "firmware_version" TEXT;

UPDATE "auth_session"
SET "correlation_id" = "id"::text
WHERE "correlation_id" IS NULL;

ALTER TABLE "auth_session"
ALTER COLUMN "correlation_id" SET NOT NULL;

ALTER TABLE "actuation_command"
ADD COLUMN "device_acknowledged_at" TIMESTAMP(3);

ALTER TABLE "access_event"
ADD COLUMN "correlation_id" TEXT,
ADD COLUMN "deduplication_key" TEXT;

UPDATE "access_event"
SET "correlation_id" = "session_id"::text,
    "deduplication_key" = "event_type"::text || ':' || "id"::text
WHERE "correlation_id" IS NULL OR "deduplication_key" IS NULL;

ALTER TABLE "access_event"
ALTER COLUMN "correlation_id" SET NOT NULL,
ALTER COLUMN "deduplication_key" SET NOT NULL;

CREATE UNIQUE INDEX "auth_session_correlation_id_key"
ON "auth_session"("correlation_id");

CREATE INDEX "auth_session_correlation_id_idx"
ON "auth_session"("correlation_id");

CREATE UNIQUE INDEX "access_event_deduplication_key_key"
ON "access_event"("deduplication_key");

CREATE INDEX "access_event_correlation_id_occurred_at_idx"
ON "access_event"("correlation_id", "occurred_at");

ALTER TABLE "auth_session"
ADD CONSTRAINT "auth_session_access_grant_id_fkey"
FOREIGN KEY ("access_grant_id") REFERENCES "access_grant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
