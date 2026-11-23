export type SimulatorConfig = {
  apiUrl: string;
  deviceCode: string;
  deviceToken: string;
  firmwareVersion: string;
  heartbeatIntervalMs: number;
  pollInitialDelayMs: number;
  pollMaxDelayMs: number;
  pollTimeoutMs: number;
  ackRetryDelayMs: number;
  ackMaxAttempts: number;
  stateFile: string;
  fixtureUids: {
    allowed: string;
    denied: string;
    disabledPerson: string;
  };
};

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): SimulatorConfig {
  const required = ["DEVICE_TOKEN"] as const;
  const missing = required.filter((key) => !environment[key]);
  if (missing.length > 0) {
    throw new Error(`Missing simulator environment: ${missing.join(", ")}`);
  }

  const apiUrl = (environment.API_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  new URL(apiUrl);

  const pollInitialDelayMs = integer(
    environment,
    "SIMULATOR_POLL_INITIAL_MS",
    250,
    10,
    10_000,
  );
  const pollMaxDelayMs = integer(
    environment,
    "SIMULATOR_POLL_MAX_MS",
    1_000,
    pollInitialDelayMs,
    30_000,
  );

  return {
    apiUrl,
    deviceCode: environment.DEVICE_CODE ?? "ESP32_DOOR_01",
    deviceToken: environment.DEVICE_TOKEN!,
    firmwareVersion: "simulator-0.1.0",
    heartbeatIntervalMs: integer(
      environment,
      "SIMULATOR_HEARTBEAT_INTERVAL_MS",
      10_000,
      1_000,
      300_000,
    ),
    pollInitialDelayMs,
    pollMaxDelayMs,
    pollTimeoutMs: integer(
      environment,
      "SIMULATOR_POLL_TIMEOUT_MS",
      12_000,
      100,
      300_000,
    ),
    ackRetryDelayMs: integer(
      environment,
      "SIMULATOR_ACK_RETRY_MS",
      500,
      10,
      60_000,
    ),
    ackMaxAttempts: integer(
      environment,
      "SIMULATOR_ACK_MAX_ATTEMPTS",
      5,
      1,
      100,
    ),
    stateFile:
      environment.SIMULATOR_STATE_FILE ?? ".simulator-state/seen-commands.json",
    fixtureUids: {
      allowed: environment.SIMULATOR_ALLOWED_UID ?? "04A1B2C3",
      denied: environment.SIMULATOR_DENIED_UID ?? "FFFFFFFF",
      disabledPerson: environment.SIMULATOR_DISABLED_PERSON_UID ?? "04DEAD01",
    },
  };
}

function integer(
  environment: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = Number(environment[key] ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${key} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}
