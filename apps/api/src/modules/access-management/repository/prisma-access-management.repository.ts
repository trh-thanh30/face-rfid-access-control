import { Injectable } from "@nestjs/common";
import { Prisma, type AccessGrant, type RfidCredential } from "@prisma/client";
import type {
  CreateAccessGrantInput,
  ListAccessGrantsQuery,
  UpdateAccessGrantInput,
} from "@access/shared";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  ActiveRfidUidConflictError,
  type AccessGrantRecord,
  type AccessGrantRepository,
  type CredentialRecord,
  type PaginatedAccessGrants,
  type RfidCredentialRepository,
} from "./access-management.repository.interface";

@Injectable()
export class PrismaRfidCredentialRepository implements RfidCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async attach(input: {
    personId: string;
    uidHash: string;
    displayHint: string;
    replaceExisting: boolean;
  }): Promise<CredentialRecord> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (input.replaceExisting) {
          await transaction.rfidCredential.updateMany({
            where: { person_id: input.personId, status: "ACTIVE" },
            data: { status: "REVOKED", revoked_at: new Date() },
          });
        }
        const credential = await transaction.rfidCredential.create({
          data: {
            person_id: input.personId,
            uid_hash: input.uidHash,
            display_hint: input.displayHint,
          },
        });
        await transaction.adminAuditEvent.create({
          data: {
            action: "RFID_CREDENTIAL_ATTACHED",
            entity_type: "RFID_CREDENTIAL",
            entity_id: credential.id,
            metadata: {
              personId: input.personId,
              displayHint: input.displayHint,
              replacedExisting: input.replaceExisting,
            },
          },
        });
        return mapCredential(credential);
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ActiveRfidUidConflictError("RFID UID is already active");
      }
      throw error;
    }
  }

  async revoke(id: string): Promise<CredentialRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.rfidCredential.findUnique({
        where: { id },
      });
      if (!current) return null;
      if (current.status === "REVOKED") return mapCredential(current);
      const credential = await transaction.rfidCredential.update({
        where: { id },
        data: { status: "REVOKED", revoked_at: new Date() },
      });
      await transaction.adminAuditEvent.create({
        data: {
          action: "RFID_CREDENTIAL_REVOKED",
          entity_type: "RFID_CREDENTIAL",
          entity_id: credential.id,
          metadata: { personId: credential.person_id },
        },
      });
      return mapCredential(credential);
    });
  }

  async findLatestByUidHash(uidHash: string): Promise<CredentialRecord | null> {
    const credential = await this.prisma.rfidCredential.findFirst({
      where: { uid_hash: uidHash },
      orderBy: [{ issued_at: "desc" }, { id: "desc" }],
      include: { person: { select: { status: true } } },
    });
    return credential
      ? { ...mapCredential(credential), personStatus: credential.person.status }
      : null;
  }

  async listForPerson(personId: string): Promise<CredentialRecord[]> {
    const credentials = await this.prisma.rfidCredential.findMany({
      where: { person_id: personId },
      orderBy: [{ issued_at: "desc" }, { id: "desc" }],
    });
    return credentials.map(mapCredential);
  }
}

@Injectable()
export class PrismaAccessGrantRepository implements AccessGrantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async accessPointExists(id: string): Promise<boolean> {
    return (await this.prisma.accessPoint.count({ where: { id } })) > 0;
  }

  async create(input: CreateAccessGrantInput): Promise<AccessGrantRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const grant = await transaction.accessGrant.create({
        data: toCreateGrantData(input),
      });
      await transaction.adminAuditEvent.create({
        data: {
          action: "ACCESS_GRANT_CREATED",
          entity_type: "ACCESS_GRANT",
          entity_id: grant.id,
          metadata: {
            personId: input.personId,
            accessPointId: input.accessPointId,
          },
        },
      });
      return mapGrant(grant);
    });
  }

  async update(
    id: string,
    input: UpdateAccessGrantInput,
  ): Promise<AccessGrantRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.accessGrant.findUnique({
        where: { id },
      });
      if (!current) return null;
      const grant = await transaction.accessGrant.update({
        where: { id },
        data: toUpdateGrantData(input),
      });
      await transaction.adminAuditEvent.create({
        data: {
          action: "ACCESS_GRANT_UPDATED",
          entity_type: "ACCESS_GRANT",
          entity_id: grant.id,
          metadata: { changedFields: Object.keys(input) },
        },
      });
      return mapGrant(grant);
    });
  }

  async revoke(id: string): Promise<AccessGrantRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.accessGrant.findUnique({
        where: { id },
      });
      if (!current) return null;
      if (current.status === "REVOKED") return mapGrant(current);
      const grant = await transaction.accessGrant.update({
        where: { id },
        data: { status: "REVOKED" },
      });
      await transaction.adminAuditEvent.create({
        data: {
          action: "ACCESS_GRANT_REVOKED",
          entity_type: "ACCESS_GRANT",
          entity_id: grant.id,
        },
      });
      return mapGrant(grant);
    });
  }

  async findById(id: string): Promise<AccessGrantRecord | null> {
    const grant = await this.prisma.accessGrant.findUnique({ where: { id } });
    return grant ? mapGrant(grant) : null;
  }

  async list(query: ListAccessGrantsQuery): Promise<PaginatedAccessGrants> {
    const where: Prisma.AccessGrantWhereInput = {
      person_id: query.personId,
      access_point_id: query.accessPointId,
      status: query.status,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.accessGrant.findMany({
        where,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.accessGrant.count({ where }),
    ]);
    return {
      items: items.map(mapGrant),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findActiveForPersonAtPoint(
    personId: string,
    accessPointId: string,
  ): Promise<AccessGrantRecord[]> {
    const grants = await this.prisma.accessGrant.findMany({
      where: {
        person_id: personId,
        access_point_id: accessPointId,
        status: "ACTIVE",
      },
    });
    return grants.map(mapGrant);
  }
}

function mapCredential(credential: RfidCredential): CredentialRecord {
  return {
    id: credential.id,
    personId: credential.person_id,
    uidHash: credential.uid_hash,
    displayHint: credential.display_hint,
    status: credential.status,
    issuedAt: credential.issued_at,
    revokedAt: credential.revoked_at,
  };
}

function mapGrant(grant: AccessGrant): AccessGrantRecord {
  return {
    id: grant.id,
    personId: grant.person_id,
    accessPointId: grant.access_point_id,
    validFrom: grant.valid_from.toISOString().slice(0, 10),
    validUntil: grant.valid_until.toISOString().slice(0, 10),
    timeFrom: grant.time_from.toISOString().slice(11, 19),
    timeUntil: grant.time_until.toISOString().slice(11, 19),
    timezone: grant.timezone,
    status: grant.status,
    createdAt: grant.created_at,
    updatedAt: grant.updated_at,
  };
}

function toCreateGrantData(
  input: CreateAccessGrantInput,
): Prisma.AccessGrantUncheckedCreateInput {
  return {
    person_id: input.personId,
    access_point_id: input.accessPointId,
    valid_from: new Date(`${input.validFrom}T00:00:00Z`),
    valid_until: new Date(`${input.validUntil}T00:00:00Z`),
    time_from: new Date(`1970-01-01T${input.timeFrom}Z`),
    time_until: new Date(`1970-01-01T${input.timeUntil}Z`),
    timezone: input.timezone,
  };
}

function toUpdateGrantData(
  input: UpdateAccessGrantInput,
): Prisma.AccessGrantUncheckedUpdateInput {
  return {
    ...(input.validFrom
      ? { valid_from: new Date(`${input.validFrom}T00:00:00Z`) }
      : {}),
    ...(input.validUntil
      ? { valid_until: new Date(`${input.validUntil}T00:00:00Z`) }
      : {}),
    ...(input.timeFrom
      ? { time_from: new Date(`1970-01-01T${input.timeFrom}Z`) }
      : {}),
    ...(input.timeUntil
      ? { time_until: new Date(`1970-01-01T${input.timeUntil}Z`) }
      : {}),
    ...(input.timezone ? { timezone: input.timezone } : {}),
  };
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
