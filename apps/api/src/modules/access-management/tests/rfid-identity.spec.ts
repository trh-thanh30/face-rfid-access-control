import { ConfigService } from "@nestjs/config";
import { ConflictException } from "@nestjs/common";
import type { PersonRepository } from "../../people/repository/person.repository.interface";
import {
  InvalidRfidUidError,
  RfidIdentityService,
} from "../domain/rfid-identity";
import {
  ActiveRfidUidConflictError,
  type RfidCredentialRepository,
} from "../repository/access-management.repository.interface";
import { AttachRfidCredentialUseCase } from "../use-cases/access-management.use-cases";

describe("RfidIdentityService", () => {
  const service = new RfidIdentityService(
    new ConfigService({ RFID_HASH_KEY: "test-only-secret" }),
  );

  it("canonicalizes common reader formats before keyed hashing", () => {
    expect(service.identify("04:a1-b2 c3")).toEqual(
      service.identify("04A1B2C3"),
    );
  });

  it("stores only a safe display hint alongside the hash", () => {
    const identity = service.identify("04A1B2C3");
    expect(identity.uidHash).toMatch(/^[a-f0-9]{64}$/);
    expect(identity.displayHint).toBe("…B2C3");
    expect(identity.uidHash).not.toContain("04A1B2C3");
  });

  it("rejects malformed or odd-length identifiers", () => {
    expect(() => service.identify("not-a-uid")).toThrow(InvalidRfidUidError);
    expect(() => service.identify("ABC")).toThrow(InvalidRfidUidError);
  });

  it("maps a concurrent duplicate active UID to a stable conflict", async () => {
    const people = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: "person-id", status: "ACTIVE" }),
    } as unknown as PersonRepository;
    const credentials = {
      attach: jest.fn().mockRejectedValue(new ActiveRfidUidConflictError()),
    } as unknown as RfidCredentialRepository;
    await expect(
      new AttachRfidCredentialUseCase(people, credentials, service).execute(
        "person-id",
        "04A1B2C3",
        false,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
