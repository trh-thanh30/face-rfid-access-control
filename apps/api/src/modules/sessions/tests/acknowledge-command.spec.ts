import { BadRequestException, ConflictException } from "@nestjs/common";
import type { ClockPort } from "../../../common/clock/clock.port";
import type { DeviceRepository } from "../../devices/repository/device.repository.interface";
import type { SessionRepository } from "../repository/session.repository.interface";
import { AcknowledgeCommandUseCase } from "../use-cases/session.use-cases";

describe("AcknowledgeCommandUseCase", () => {
  const clock: ClockPort = { now: () => new Date("2026-11-23T03:00:05Z") };
  const principal = {
    id: "device-id",
    deviceCode: "DEVICE_01",
    accessPointId: "point-id",
  };
  const acknowledgement = {
    commandId: "77777777-7777-4777-8777-777777777777",
    executionStatus: "APPLIED_UNCONFIRMED" as const,
    timestamp: "2026-11-23T10:00:05+07:00",
  };

  it("accepts an identical retry without creating another logical result", async () => {
    const acknowledge = jest
      .fn()
      .mockResolvedValueOnce("ACCEPTED")
      .mockResolvedValueOnce("DUPLICATE");
    const sessions = { acknowledge } as unknown as SessionRepository;
    const devices = {
      findById: jest
        .fn()
        .mockResolvedValue({ capabilities: { doorSensor: false } }),
    } as unknown as DeviceRepository;
    const useCase = new AcknowledgeCommandUseCase(sessions, devices, clock);

    await useCase.execute(principal, "session-id", acknowledgement);
    await useCase.execute(principal, "session-id", acknowledgement);
    expect(acknowledge).toHaveBeenCalledTimes(2);
  });

  it("rejects CONFIRMED when the device has no door sensor", async () => {
    const sessions = { acknowledge: jest.fn() } as unknown as SessionRepository;
    const devices = {
      findById: jest
        .fn()
        .mockResolvedValue({ capabilities: { doorSensor: false } }),
    } as unknown as DeviceRepository;
    await expect(
      new AcknowledgeCommandUseCase(sessions, devices, clock).execute(
        principal,
        "session-id",
        { ...acknowledgement, executionStatus: "CONFIRMED" },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("fails closed when a command is expired", async () => {
    const sessions = {
      acknowledge: jest.fn().mockResolvedValue("EXPIRED"),
    } as unknown as SessionRepository;
    const devices = {
      findById: jest
        .fn()
        .mockResolvedValue({ capabilities: { doorSensor: false } }),
    } as unknown as DeviceRepository;
    await expect(
      new AcknowledgeCommandUseCase(sessions, devices, clock).execute(
        principal,
        "session-id",
        acknowledgement,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects a conflicting acknowledgement", async () => {
    const sessions = {
      acknowledge: jest.fn().mockResolvedValue("CONFLICT"),
    } as unknown as SessionRepository;
    const devices = {
      findById: jest
        .fn()
        .mockResolvedValue({ capabilities: { doorSensor: false } }),
    } as unknown as DeviceRepository;
    await expect(
      new AcknowledgeCommandUseCase(sessions, devices, clock).execute(
        principal,
        "session-id",
        acknowledgement,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
