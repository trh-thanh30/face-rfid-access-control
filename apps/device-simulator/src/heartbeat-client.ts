import {
  ACCESS_CONTRACT_VERSION,
  ACCESS_CONTRACT_VERSION_HEADER,
  DEVICE_CODE_HEADER,
  DEVICE_ENDPOINTS,
  DEVICE_ID_HEADER,
  deviceHeartbeatSchema,
} from "@access/shared";
import type { SimulatorConfig } from "./config.js";

export async function sendHeartbeat(
  config: SimulatorConfig,
  fetchImplementation: typeof fetch = fetch,
): Promise<string> {
  const heartbeat = deviceHeartbeatSchema.parse({
    deviceCode: config.deviceCode,
    timestamp: new Date().toISOString(),
    firmwareVersion: config.firmwareVersion,
    uptimeSeconds: Math.floor(process.uptime()),
    capabilities: {
      rfid: true,
      actuator: "VIRTUAL",
      doorSensor: false,
      indicators: true,
    },
  });
  const response = await fetchImplementation(
    `${config.apiUrl}${DEVICE_ENDPOINTS.heartbeat}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.deviceToken}`,
        [DEVICE_CODE_HEADER]: config.deviceCode,
        [ACCESS_CONTRACT_VERSION_HEADER]: ACCESS_CONTRACT_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(heartbeat),
    },
  );
  if (!response.ok) {
    throw new Error(`Heartbeat rejected with HTTP ${response.status}`);
  }
  const deviceId = response.headers.get(DEVICE_ID_HEADER);
  if (!deviceId || !isUuid(deviceId)) {
    throw new Error(`Heartbeat response is missing ${DEVICE_ID_HEADER}`);
  }
  return deviceId;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
