export type SimulatorConfig = {
  apiUrl: string;
  deviceCode: string;
  deviceToken: string;
  firmwareVersion: string;
};

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): SimulatorConfig {
  const required = ["DEVICE_TOKEN"] as const;
  const missing = required.filter((key) => !environment[key]);
  if (missing.length > 0) {
    throw new Error(`Missing simulator environment: ${missing.join(", ")}`);
  }

  return {
    apiUrl: environment.API_URL ?? "http://localhost:3000/api/v1",
    deviceCode: environment.DEVICE_CODE ?? "ESP32_DOOR_01",
    deviceToken: environment.DEVICE_TOKEN!,
    firmwareVersion: "simulator-0.1.0",
  };
}
