import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type {
  DeviceCredentialRecord,
  DeviceRepository,
} from "../repository/device.repository.interface";
import { DeviceAuthenticationService } from "../use-cases/device.use-cases";
import { SecurityAttemptLimiter } from "../../../common/security/security-attempt-limiter";
import { ConfigService } from "@nestjs/config";

describe("DeviceAuthenticationService", () => {
  const limiter = () => new SecurityAttemptLimiter(new ConfigService());
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
      new DeviceAuthenticationService(repository, limiter()).authenticate(
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
        new DeviceAuthenticationService(repository, limiter()).authenticate(
          "ESP32_DOOR_01",
          token,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it("rate limits repeated device authentication failures", async () => {
    const repository = {
      findCredentialByCode: jest.fn().mockResolvedValue(null),
    } as unknown as DeviceRepository;
    const attempts = new SecurityAttemptLimiter(
      new ConfigService({ DEVICE_AUTH_MAX_FAILURES: 2 }),
    );
    const service = new DeviceAuthenticationService(repository, attempts);
    await expect(
      service.authenticate("DEVICE_TARGET", "wrong"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.authenticate("DEVICE_TARGET", "wrong"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.authenticate("DEVICE_TARGET", "wrong"),
    ).rejects.toMatchObject({ status: 429 });
    expect(repository.findCredentialByCode).toHaveBeenCalledTimes(2);
  });
});
