import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { DeviceRepository } from "../repository/device.repository.interface";
import { DeviceSessionOwnershipGuard } from "../guards/device-session-ownership.guard";

function context(deviceId: string, sessionId: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        params: { sessionId },
        device: { id: deviceId },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("DeviceSessionOwnershipGuard", () => {
  it("rejects a valid device credential for another device session", async () => {
    const devices = {
      sessionBelongsToDevice: jest.fn().mockResolvedValue(false),
    } as unknown as DeviceRepository;
    const guard = new DeviceSessionOwnershipGuard(devices);
    await expect(
      guard.canActivate(context("device-b", "session-a")),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
