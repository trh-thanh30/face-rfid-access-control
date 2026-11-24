import { validateEnvironment } from "./env";

jest.mock("@access/shared", () => ({
  RELIABILITY_PROFILE_VERSION: "wp09-v1",
  RELIABILITY_DEFAULTS: {
    offlineThresholdMs: 30_000,
    sessionTtlMs: 10_000,
    commandTtlMs: 5_000,
    openDurationMs: 3_000,
    visionRequestTimeoutMs: 10_000,
  },
}));

const validEnvironment = {
  DATABASE_URL: "postgresql://example",
  JWT_SECRET: "secret",
  RFID_HASH_KEY: "hash-key",
  VISION_URL: "http://vision:8001",
  VISION_SERVICE_TOKEN: "vision-token",
  DEVICE_OFFLINE_THRESHOLD_SECONDS: 30,
  AUTH_SESSION_TTL_SECONDS: 10,
  ACTUATION_COMMAND_TTL_SECONDS: 5,
  ACTUATION_OPEN_DURATION_MS: 3000,
  VISION_MINIMUM_VALID_FRAMES: 3,
  VISION_REQUEST_TIMEOUT_MS: 10000,
  VISION_ENROLLMENT_TIMEOUT_SECONDS: 30,
  VISION_VERIFICATION_THRESHOLD: 0.65,
};

describe("reliability environment", () => {
  it("applies the locked profile version", () => {
    expect(validateEnvironment({ ...validEnvironment })).toMatchObject({
      RELIABILITY_PROFILE_VERSION: "wp09-v1",
    });
  });

  it("rejects timing drift without a new profile version", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        AUTH_SESSION_TTL_SECONDS: 11,
      }),
    ).toThrow(`AUTH_SESSION_TTL_SECONDS must be 10`);
  });

  it("rejects known development secrets in production", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: "production",
        VISION_SERVICE_TOKEN: "development-vision-token",
      }),
    ).toThrow("VISION_SERVICE_TOKEN must be rotated for production");
  });
});
