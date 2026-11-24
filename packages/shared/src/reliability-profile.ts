export const RELIABILITY_PROFILE_VERSION = "wp09-v1" as const;

export const RELIABILITY_DEFAULTS = Object.freeze({
  heartbeatIntervalMs: 10_000,
  offlineThresholdMs: 30_000,
  sessionTtlMs: 10_000,
  commandTtlMs: 5_000,
  openDurationMs: 3_000,
  pollInitialDelayMs: 250,
  pollMaxDelayMs: 1_000,
  pollTimeoutMs: 12_000,
  ackRetryDelayMs: 1_000,
  ackMaxAttempts: 5,
  visionRequestTimeoutMs: 10_000,
});
