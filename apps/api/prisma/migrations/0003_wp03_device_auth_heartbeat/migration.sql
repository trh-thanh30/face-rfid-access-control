ALTER TABLE "device"
ADD COLUMN "device_reported_at" TIMESTAMP(3),
ADD COLUMN "uptime_seconds" INTEGER,
ADD COLUMN "rssi" INTEGER,
ADD COLUMN "reset_reason" TEXT,
ADD COLUMN "credential_rotated_at" TIMESTAMP(3);
