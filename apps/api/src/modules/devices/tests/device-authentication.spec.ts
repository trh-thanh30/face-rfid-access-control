import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type {
  DeviceCredentialRecord,
  DeviceRepository,
} from "../repository/device.repository.interface";
import { DeviceAuthenticationService } from "../use-cases/device.use-cases";

describe("DeviceAuthenticationService", () => {
  async function credential(
    overrides: Partial<DeviceCredentialRecord> = {},
  ): Promise<DeviceCredentialRecord> {
    return {
      id: "device-id",
      accessPointId: "point-id",
      deviceCode: "ESP32_DOOR_01",
      status: "ACTIVE",
      tokenHash: await bcrypt.hash("correct-token", 4),
      firmwareVersion: null,
      capabilities: null,
      lastSeenAt: null,
      deviceReportedAt: null,
      uptimeSeconds: null,
      rssi: null,
      resetReason: null,
      credentialRotatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  it("authenticates an active registered device", async () => {
    const repository = {
      findCredentialByCode: jest.fn().mockResolvedValue(await credential()),
    } as unknown as DeviceRepository;
    await expect(
      new DeviceAuthenticationService(repository).authenticate(
        "ESP32_DOOR_01",
        "correct-token",
      ),
    ).resolves.toEqual({
      id: "device-id",
      deviceCode: "ESP32_DOOR_01",
      accessPointId: "point-id",
    });
  });

  it.each([
    ["unknown", "correct-token"],
    ["disabled", "correct-token"],
    ["active", "wrong-token"],
  ])(
    "uses the same rejection for %s devices/credentials",
    async (kind, token) => {
      const record =
        kind === "unknown"
          ? null
          : await credential({
              status: kind === "disabled" ? "DISABLED" : "ACTIVE",
            });
      const repository = {
        findCredentialByCode: jest.fn().mockResolvedValue(record),
      } as unknown as DeviceRepository;
      await expect(
        new DeviceAuthenticationService(repository).authenticate(
          "ESP32_DOOR_01",
          token,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );
});
