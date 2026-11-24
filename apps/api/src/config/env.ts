import {
  RELIABILITY_DEFAULTS,
  RELIABILITY_PROFILE_VERSION,
} from "@access/shared";

export type AppEnvironment = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  adminUrl: string;
};

export function validateEnvironment(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "RFID_HASH_KEY",
    "VISION_URL",
    "VISION_SERVICE_TOKEN",
  ] as const;
  const missing = required.filter((key) => !values[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  if (String(values.NODE_ENV) === "production") {
    const forbiddenDevelopmentSecrets = [
      ["JWT_SECRET", "replace-with-at-least-32-random-characters"],
      ["RFID_HASH_KEY", "replace-with-an-independent-random-secret"],
      ["VISION_SERVICE_TOKEN", "development-vision-token"],
    ] as const;
    for (const [key, forbidden] of forbiddenDevelopmentSecrets) {
      if (values[key] === forbidden) {
        throw new Error(`${key} must be rotated for production`);
      }
    }
  }

  const port = Number(values.PORT ?? values.API_PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error("PORT must be a valid TCP port");
  }

  const offlineThreshold = Number(
    values.DEVICE_OFFLINE_THRESHOLD_SECONDS ?? 30,
  );
  if (
    !Number.isInteger(offlineThreshold) ||
    offlineThreshold < 5 ||
    offlineThreshold > 3600
  ) {
    throw new Error(
      "DEVICE_OFFLINE_THRESHOLD_SECONDS must be an integer from 5 to 3600",
    );
  }

  const boundedIntegers = [
    ["AUTH_SESSION_TTL_SECONDS", 3, 120],
    ["ACTUATION_COMMAND_TTL_SECONDS", 1, 60],
    ["ACTUATION_OPEN_DURATION_MS", 100, 60_000],
    ["VISION_MINIMUM_VALID_FRAMES", 1, 30],
    ["VISION_REQUEST_TIMEOUT_MS", 100, 120_000],
    ["VISION_ENROLLMENT_TIMEOUT_SECONDS", 5, 300],
  ] as const;
  for (const [key, minimum, maximum] of boundedIntegers) {
    const parsed = Number(values[key]);
    if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
      throw new Error(
        `${key} must be an integer from ${minimum} to ${maximum}`,
      );
    }
    values[key] = parsed;
  }

  const fakeFaceMode = String(values.FAKE_FACE_MODE ?? "allow");
  if (!["allow", "mismatch", "camera_busy", "timeout"].includes(fakeFaceMode)) {
    throw new Error(
      "FAKE_FACE_MODE must be allow, mismatch, camera_busy, or timeout",
    );
  }
  values.FAKE_FACE_MODE = fakeFaceMode;

  const threshold = Number(values.VISION_VERIFICATION_THRESHOLD);
  if (!Number.isFinite(threshold) || threshold < -1 || threshold > 1) {
    throw new Error("VISION_VERIFICATION_THRESHOLD must be from -1 to 1");
  }
  values.VISION_VERIFICATION_THRESHOLD = threshold;

  const reliabilityProfile = String(
    values.RELIABILITY_PROFILE_VERSION ?? RELIABILITY_PROFILE_VERSION,
  );
  if (reliabilityProfile !== RELIABILITY_PROFILE_VERSION) {
    throw new Error(
      `RELIABILITY_PROFILE_VERSION must be ${RELIABILITY_PROFILE_VERSION}`,
    );
  }
  const lockedValues = [
    [
      "DEVICE_OFFLINE_THRESHOLD_SECONDS",
      offlineThreshold,
      RELIABILITY_DEFAULTS.offlineThresholdMs / 1000,
    ],
    [
      "AUTH_SESSION_TTL_SECONDS",
      values.AUTH_SESSION_TTL_SECONDS,
      RELIABILITY_DEFAULTS.sessionTtlMs / 1000,
    ],
    [
      "ACTUATION_COMMAND_TTL_SECONDS",
      values.ACTUATION_COMMAND_TTL_SECONDS,
      RELIABILITY_DEFAULTS.commandTtlMs / 1000,
    ],
    [
      "ACTUATION_OPEN_DURATION_MS",
      values.ACTUATION_OPEN_DURATION_MS,
      RELIABILITY_DEFAULTS.openDurationMs,
    ],
    [
      "VISION_REQUEST_TIMEOUT_MS",
      values.VISION_REQUEST_TIMEOUT_MS,
      RELIABILITY_DEFAULTS.visionRequestTimeoutMs,
    ],
  ] as const;
  for (const [key, actual, expected] of lockedValues) {
    if (actual !== expected) {
      throw new Error(`${key} must be ${expected} for ${reliabilityProfile}`);
    }
  }

  const securityIntegers = [
    ["SECURITY_ATTEMPT_WINDOW_SECONDS", 60, 10, 3600],
    ["ADMIN_LOGIN_MAX_FAILURES", 5, 2, 100],
    ["DEVICE_AUTH_MAX_FAILURES", 10, 2, 1000],
  ] as const;
  for (const [key, fallback, minimum, maximum] of securityIntegers) {
    const value = Number(values[key] ?? fallback);
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw new Error(
        `${key} must be an integer from ${minimum} to ${maximum}`,
      );
    }
    values[key] = value;
  }

  return {
    ...values,
    PORT: port,
    DEVICE_OFFLINE_THRESHOLD_SECONDS: offlineThreshold,
    RELIABILITY_PROFILE_VERSION: reliabilityProfile,
  };
}
