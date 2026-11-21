import {
  ACCESS_CONTRACT_VERSION,
  ACCESS_CONTRACT_VERSION_HEADER,
  deviceHeartbeatSchema,
} from "@access/shared";
import { loadConfig } from "./config.js";

const config = loadConfig();
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

console.log("Device Simulator scaffold is ready", {
  apiUrl: config.apiUrl,
  contract: {
    header: ACCESS_CONTRACT_VERSION_HEADER,
    version: ACCESS_CONTRACT_VERSION,
  },
  heartbeat,
});
