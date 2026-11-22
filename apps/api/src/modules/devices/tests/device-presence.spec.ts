import { ConfigService } from "@nestjs/config";
import type { ClockPort } from "../../../common/clock/clock.port";
import { DevicePresencePolicy } from "../use-cases/device.use-cases";

describe("DevicePresencePolicy", () => {
  const now = new Date("2026-11-22T10:00:30.000Z");
  const fakeClock: ClockPort = { now: () => now };
  const policy = new DevicePresencePolicy(
    new ConfigService({ DEVICE_OFFLINE_THRESHOLD_SECONDS: 30 }),
    fakeClock,
  );

  it("is online through the configured threshold boundary", () => {
    expect(policy.isOnline(new Date("2026-11-22T10:00:00.000Z"))).toBe(true);
  });

  it("is offline without heartbeat or after the threshold", () => {
    expect(policy.isOnline(null)).toBe(false);
    expect(policy.isOnline(new Date("2026-11-22T09:59:59.999Z"))).toBe(false);
  });

  it("does not treat a future client timestamp as online", () => {
    expect(policy.isOnline(new Date("2026-11-22T10:00:31.000Z"))).toBe(false);
  });
});
