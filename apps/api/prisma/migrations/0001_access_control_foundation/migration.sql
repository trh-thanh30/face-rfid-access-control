-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Enable pgvector before creating face_template.embedding.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "person_status" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "credential_status" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "device_status" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "grant_status" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "auth_session_status" AS ENUM ('PENDING', 'VERIFYING', 'ALLOWED', 'DENIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "actuation_status" AS ENUM ('PENDING', 'APPLIED_UNCONFIRMED', 'CONFIRMED', 'FAILED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "access_event_type" AS ENUM ('DECISION', 'ACTUATION', 'DEVICE');

-- CreateTable
CREATE TABLE "admin_account" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "admin_role" NOT NULL DEFAULT 'ADMIN',
    "status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "status" "person_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfid_credential" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "uid_hash" TEXT NOT NULL,
    "display_hint" TEXT,
    "status" "credential_status" NOT NULL DEFAULT 'ACTIVE',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfid_credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_template" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "embedding" vector(512) NOT NULL,
    "model_version" TEXT NOT NULL,
    "pipeline_fingerprint" TEXT NOT NULL,
    "quality_score" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_point" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_point_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device" (
    "id" UUID NOT NULL,
    "access_point_id" UUID NOT NULL,
    "device_code" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "device_status" NOT NULL DEFAULT 'ACTIVE',
    "firmware_version" TEXT,
    "capabilities" JSONB,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_grant" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "access_point_id" UUID NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE NOT NULL,
    "time_from" TIME(0) NOT NULL,
    "time_until" TIME(0) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "status" "grant_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_session" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "rfid_credential_id" UUID,
    "person_id" UUID,
    "status" "auth_session_status" NOT NULL DEFAULT 'PENDING',
    "reason_code" TEXT,
    "similarity" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "model_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actuation_command" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "open_duration_ms" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "execution_status" "actuation_status" NOT NULL DEFAULT 'PENDING',
    "error_code" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actuation_command_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_event" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "person_id" UUID,
    "event_type" "access_event_type" NOT NULL,
    "result" TEXT NOT NULL,
    "reason_code" TEXT,
    "similarity" DOUBLE PRECISION,
    "latency_ms" INTEGER,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_account_email_key" ON "admin_account"("email");

-- CreateIndex
CREATE INDEX "admin_account_role_status_idx" ON "admin_account"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "person_code_key" ON "person"("code");

-- CreateIndex
CREATE INDEX "person_status_idx" ON "person"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rfid_credential_uid_hash_key" ON "rfid_credential"("uid_hash");

-- CreateIndex
CREATE INDEX "rfid_credential_person_id_status_idx" ON "rfid_credential"("person_id", "status");

-- CreateIndex
CREATE INDEX "face_template_person_id_is_active_idx" ON "face_template"("person_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "access_point_code_key" ON "access_point"("code");

-- CreateIndex
CREATE UNIQUE INDEX "device_device_code_key" ON "device"("device_code");

-- CreateIndex
CREATE INDEX "device_access_point_id_status_idx" ON "device"("access_point_id", "status");

-- CreateIndex
CREATE INDEX "device_last_seen_at_idx" ON "device"("last_seen_at");

-- CreateIndex
CREATE INDEX "access_grant_person_id_access_point_id_status_idx" ON "access_grant"("person_id", "access_point_id", "status");

-- CreateIndex
CREATE INDEX "access_grant_valid_from_valid_until_idx" ON "access_grant"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "auth_session_status_expires_at_idx" ON "auth_session"("status", "expires_at");

-- CreateIndex
CREATE INDEX "auth_session_person_id_created_at_idx" ON "auth_session"("person_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_device_id_request_id_key" ON "auth_session"("device_id", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "actuation_command_session_id_key" ON "actuation_command"("session_id");

-- CreateIndex
CREATE INDEX "actuation_command_device_id_expires_at_idx" ON "actuation_command"("device_id", "expires_at");

-- CreateIndex
CREATE INDEX "access_event_session_id_occurred_at_idx" ON "access_event"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "access_event_device_id_occurred_at_idx" ON "access_event"("device_id", "occurred_at");

-- CreateIndex
CREATE INDEX "access_event_person_id_occurred_at_idx" ON "access_event"("person_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "rfid_credential" ADD CONSTRAINT "rfid_credential_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_template" ADD CONSTRAINT "face_template_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device" ADD CONSTRAINT "device_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "access_point"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grant" ADD CONSTRAINT "access_grant_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grant" ADD CONSTRAINT "access_grant_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "access_point"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_rfid_credential_id_fkey" FOREIGN KEY ("rfid_credential_id") REFERENCES "rfid_credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actuation_command" ADD CONSTRAINT "actuation_command_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actuation_command" ADD CONSTRAINT "actuation_command_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_event" ADD CONSTRAINT "access_event_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_event" ADD CONSTRAINT "access_event_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_event" ADD CONSTRAINT "access_event_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
