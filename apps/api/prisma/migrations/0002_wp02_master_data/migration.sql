-- A UID may be reassigned after revocation, but only one ACTIVE credential may own it.
DROP INDEX "rfid_credential_uid_hash_key";
CREATE UNIQUE INDEX "rfid_credential_active_uid_hash_key"
ON "rfid_credential"("uid_hash")
WHERE "status" = 'ACTIVE';

CREATE TABLE "admin_audit_event" (
    "id" UUID NOT NULL,
    "actor_admin_account_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_event_entity_type_entity_id_occurred_at_idx"
ON "admin_audit_event"("entity_type", "entity_id", "occurred_at");

CREATE INDEX "admin_audit_event_actor_admin_account_id_occurred_at_idx"
ON "admin_audit_event"("actor_admin_account_id", "occurred_at");

ALTER TABLE "admin_audit_event"
ADD CONSTRAINT "admin_audit_event_actor_admin_account_id_fkey"
FOREIGN KEY ("actor_admin_account_id") REFERENCES "admin_account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
