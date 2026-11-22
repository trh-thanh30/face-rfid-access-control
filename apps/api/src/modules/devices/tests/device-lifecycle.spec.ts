import * as bcrypt from "bcryptjs";
import type { ClockPort } from "../../../common/clock/clock.port";
import type {
  DeviceRecord,
  DeviceRepository,
} from "../repository/device.repository.interface";
import {
  RegisterDeviceUseCase,
  RotateDeviceCredentialUseCase,
} from "../use-cases/device.use-cases";

describe("device credential lifecycle", () => {
  const now = new Date("2026-11-22T10:00:00Z");
  const clock: ClockPort = { now: () => now };
  const device: DeviceRecord = {
    id: "device-id",
    accessPointId: "34c87d34-cb0d-41fb-a4be-d08c19df183e",
    deviceCode: "ESP32_DOOR_02",
    status: "ACTIVE",
    firmwareVersion: null,
    capabilities: null,
    lastSeenAt: null,
    deviceReportedAt: null,
    uptimeSeconds: null,
    rssi: null,
    resetReason: null,
    credentialRotatedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  it("returns a generated token once and persists only its hash", async () => {
    const create = jest.fn().mockResolvedValue(device);
    const repository = {
      accessPointExists: jest.fn().mockResolvedValue(true),
      create,
    } as unknown as DeviceRepository;
    const result = await new RegisterDeviceUseCase(repository, clock).execute({
      accessPointId: device.accessPointId,
      deviceCode: device.deviceCode,
    });
    const persisted = create.mock.calls[0][0];

    expect(result.device).not.toHaveProperty("tokenHash");
    expect(result.credential.issuedOnce).toBe(true);
    expect(persisted).not.toHaveProperty("token");
    expect(
      await bcrypt.compare(result.credential.token, persisted.tokenHash),
    ).toBe(true);
  });

  it("rotation generates a new secret and sends only its hash to the repository", async () => {
    const rotateCredential = jest.fn().mockResolvedValue(true);
    const repository = { rotateCredential } as unknown as DeviceRepository;
    const result = await new RotateDeviceCredentialUseCase(
      repository,
      clock,
    ).execute("device-id");
    const [, persistedHash, rotatedAt] = rotateCredential.mock.calls[0];

    expect(rotatedAt).toEqual(now);
    expect(await bcrypt.compare(result.credential.token, persistedHash)).toBe(
      true,
    );
    expect(persistedHash).not.toBe(result.credential.token);
  });
});
