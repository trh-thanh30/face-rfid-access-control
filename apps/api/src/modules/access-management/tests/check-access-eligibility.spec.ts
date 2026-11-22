import { ConfigService } from "@nestjs/config";
import type {
  AccessGrantRepository,
  CredentialRecord,
  RfidCredentialRepository,
} from "../repository/access-management.repository.interface";
import { RfidIdentityService } from "../domain/rfid-identity";
import { CheckAccessEligibilityUseCase } from "../use-cases/access-management.use-cases";

describe("CheckAccessEligibilityUseCase", () => {
  const identity = new RfidIdentityService(
    new ConfigService({ RFID_HASH_KEY: "test-only-secret" }),
  );
  const activeCredential: CredentialRecord = {
    id: "credential-id",
    personId: "person-id",
    uidHash: identity.identify("04A1B2C3").uidHash,
    displayHint: "…B2C3",
    status: "ACTIVE",
    personStatus: "ACTIVE",
    issuedAt: new Date(),
    revokedAt: null,
  };
  const grant = {
    id: "grant-id",
    personId: "person-id",
    accessPointId: "point-id",
    validFrom: "2026-11-22",
    validUntil: "2026-11-22",
    timeFrom: "08:00:00",
    timeUntil: "17:00:00",
    timezone: "Asia/Ho_Chi_Minh",
    status: "ACTIVE" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function createUseCase(
    credential: CredentialRecord | null,
    grants = [grant],
  ) {
    const credentialRepository = {
      findLatestByUidHash: jest.fn().mockResolvedValue(credential),
    } as unknown as RfidCredentialRepository;
    const grantRepository = {
      findActiveForPersonAtPoint: jest.fn().mockResolvedValue(grants),
    } as unknown as AccessGrantRepository;
    return new CheckAccessEligibilityUseCase(
      credentialRepository,
      grantRepository,
      identity,
    );
  }

  it.each([
    [null, "UNKNOWN_CARD"],
    [{ ...activeCredential, status: "REVOKED" as const }, "CARD_DISABLED"],
    [
      { ...activeCredential, personStatus: "DISABLED" as const },
      "PERSON_DISABLED",
    ],
  ])(
    "returns a stable reason for invalid credential/person state",
    async (credential, reasonCode) => {
      await expect(
        createUseCase(credential).execute({
          uid: "04A1B2C3",
          accessPointId: "point-id",
          occurredAt: new Date("2026-11-22T02:00:00Z"),
        }),
      ).resolves.toMatchObject({ allowed: false, reasonCode });
    },
  );

  it("distinguishes no grant from outside the granted time", async () => {
    const input = {
      uid: "04A1B2C3",
      accessPointId: "point-id",
      occurredAt: new Date("2026-11-22T02:00:00Z"),
    };
    await expect(
      createUseCase(activeCredential, []).execute(input),
    ).resolves.toMatchObject({
      reasonCode: "NO_PERMISSION",
    });
    await expect(
      createUseCase(activeCredential).execute({
        ...input,
        occurredAt: new Date("2026-11-22T12:00:00Z"),
      }),
    ).resolves.toMatchObject({ reasonCode: "OUTSIDE_ALLOWED_TIME" });
  });

  it("returns the selected person, credential and grant when allowed", async () => {
    await expect(
      createUseCase(activeCredential).execute({
        uid: "04A1B2C3",
        accessPointId: "point-id",
        occurredAt: new Date("2026-11-22T02:00:00Z"),
      }),
    ).resolves.toEqual({
      allowed: true,
      personId: "person-id",
      credentialId: "credential-id",
      grantId: "grant-id",
    });
  });
});
