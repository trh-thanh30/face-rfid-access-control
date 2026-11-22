import type {
  CreateAccessGrantInput,
  ListAccessGrantsQuery,
  UpdateAccessGrantInput,
} from "@access/shared";

export const RFID_CREDENTIAL_REPOSITORY = Symbol("RFID_CREDENTIAL_REPOSITORY");
export const ACCESS_GRANT_REPOSITORY = Symbol("ACCESS_GRANT_REPOSITORY");

export type CredentialRecord = {
  id: string;
  personId: string;
  uidHash: string;
  displayHint: string | null;
  status: "ACTIVE" | "REVOKED";
  issuedAt: Date;
  revokedAt: Date | null;
  personStatus?: "ACTIVE" | "DISABLED";
};

export type AccessGrantRecord = {
  id: string;
  personId: string;
  accessPointId: string;
  validFrom: string;
  validUntil: string;
  timeFrom: string;
  timeUntil: string;
  timezone: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedAccessGrants = {
  items: AccessGrantRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export interface RfidCredentialRepository {
  attach(input: {
    personId: string;
    uidHash: string;
    displayHint: string;
    replaceExisting: boolean;
  }): Promise<CredentialRecord>;
  revoke(id: string): Promise<CredentialRecord | null>;
  findLatestByUidHash(uidHash: string): Promise<CredentialRecord | null>;
}

export interface AccessGrantRepository {
  accessPointExists(id: string): Promise<boolean>;
  create(input: CreateAccessGrantInput): Promise<AccessGrantRecord>;
  update(
    id: string,
    input: UpdateAccessGrantInput,
  ): Promise<AccessGrantRecord | null>;
  revoke(id: string): Promise<AccessGrantRecord | null>;
  findById(id: string): Promise<AccessGrantRecord | null>;
  list(query: ListAccessGrantsQuery): Promise<PaginatedAccessGrants>;
  findActiveForPersonAtPoint(
    personId: string,
    accessPointId: string,
  ): Promise<AccessGrantRecord[]>;
}

export class ActiveRfidUidConflictError extends Error {}
