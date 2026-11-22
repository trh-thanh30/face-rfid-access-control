import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ClockPort } from "../../../common/clock/clock.port";
import type { DeviceRepository } from "../repository/device.repository.interface";
import { DeviceSessionOwnershipGuard } from "../guards/device-session-ownership.guard";
import { RecordHeartbeatUseCase } from "../use-cases/device.use-cases";

describe("heartbeat and ownership", () => {
  const principal = {
    id: "device-a",
    deviceCode: "ESP32_DOOR_01",
    accessPointId: "point-id",
  };
  const heartbeat = {
    deviceCode: "ESP32_DOOR_01",
    timestamp: "2026-11-22T17:00:00+07:00",
    firmwareVersion: "1.0.0",
    uptimeSeconds: 42,
    rssi: -55,
    capabilities: {
      rfid: true,
      actuator: "VIRTUAL" as const,
      doorSensor: false,
      indicators: true,
    },
  };

  it("retries heartbeat by updating the same authenticated device", async () => {
    const devices = {
      updateHeartbeat: jest.fn().mockResolvedValue(undefined),
    } as unknown as DeviceRepository;
    const clock: ClockPort = { now: () => new Date("2026-11-22T10:00:01Z") };
    const useCase = new RecordHeartbeatUseCase(devices, clock);
    await useCase.execute(principal, heartbeat);
    await useCase.execute(principal, heartbeat);
    expect(devices.updateHeartbeat).toHaveBeenCalledTimes(2);
    expect(devices.updateHeartbeat).toHaveBeenLastCalledWith(
      "device-a",
      heartbeat,
      clock.now(),
    );
  });

  it("rejects a body claiming another device code", async () => {
    const devices = {
      updateHeartbeat: jest.fn(),
    } as unknown as DeviceRepository;
    await expect(
      new RecordHeartbeatUseCase(devices, { now: () => new Date() }).execute(
        principal,
        { ...heartbeat, deviceCode: "DEVICE_B" },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(devices.updateHeartbeat).not.toHaveBeenCalled();
  });

  it("prevents Device A from reading or acknowledging Device B session", async () => {
    const devices = {
      sessionBelongsToDevice: jest.fn().mockResolvedValue(false),
    } as unknown as DeviceRepository;
    const request = {
      headers: {},
      params: { sessionId: "session-b" },
      device: principal,
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    await expect(
      new DeviceSessionOwnershipGuard(devices).canActivate(context),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(devices.sessionBelongsToDevice).toHaveBeenCalledWith(
      "session-b",
      "device-a",
    );
  });
});
