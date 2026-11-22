import { loadConfig } from "./config.js";
import { sendHeartbeat } from "./heartbeat-client.js";

const config = loadConfig();

try {
  await sendHeartbeat(config);
  console.log("Device Simulator heartbeat accepted", {
    apiUrl: config.apiUrl,
    deviceCode: config.deviceCode,
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Heartbeat failed");
  process.exitCode = 1;
}
