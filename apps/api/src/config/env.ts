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
  const required = ["DATABASE_URL", "JWT_SECRET", "RFID_HASH_KEY"] as const;
  const missing = required.filter((key) => !values[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
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

  return {
    ...values,
    PORT: port,
    DEVICE_OFFLINE_THRESHOLD_SECONDS: offlineThreshold,
  };
}
