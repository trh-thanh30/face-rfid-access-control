import { AccessStateMachine } from "./access-state-machine.js";
import { PersistentCommandStore } from "./command-store.js";
import { loadConfig } from "./config.js";
import { DeviceApiClient } from "./device-api-client.js";
import { runHeartbeatLoop } from "./heartbeat-loop.js";
import { sendHeartbeat } from "./heartbeat-client.js";
import { maskUid, resolveInput } from "./input.js";
import { runScenario } from "./scenario-runner.js";
import { VirtualDoorActuator } from "./virtual-actuator.js";

const abortController = new AbortController();
process.once("SIGINT", () => abortController.abort());
process.once("SIGTERM", () => abortController.abort());

try {
  const baseConfig = loadConfig();
  const input = await resolveInput(baseConfig);
  const config =
    input.scenario === "network-error"
      ? { ...baseConfig, apiUrl: "http://127.0.0.1:1" }
      : input.scenario === "timeout"
        ? { ...baseConfig, pollTimeoutMs: 100 }
        : baseConfig;

  const log = (event: string, details: object = {}) =>
    console.log(JSON.stringify({ event, ...details }));
  log("SIMULATOR_START", {
    deviceCode: config.deviceCode,
    scenario: input.scenario,
    uidHint: maskUid(input.uid),
  });

  let authenticatedDeviceId = "00000000-0000-4000-8000-000000000000";
  if (input.scenario !== "network-error") {
    authenticatedDeviceId = await sendHeartbeat(config);
    log("HEARTBEAT_OK", { deviceId: authenticatedDeviceId });
  }

  const heartbeatTask = runHeartbeatLoop(config, abortController.signal, {
    onSignal: (signal) => {
      if (signal.type === "HEARTBEAT_OK") {
        log(signal.type, { deviceId: signal.deviceId });
      } else {
        log(signal.type, { message: signal.message });
      }
    },
  });
  const store = new PersistentCommandStore(config.stateFile);
  const machine = new AccessStateMachine(
    config,
    authenticatedDeviceId,
    new DeviceApiClient(config),
    store,
    new VirtualDoorActuator(log),
    log,
  );
  await machine.recoverAndFlush();
  const results = await runScenario(machine, input);
  log("SCENARIO_COMPLETE", { results });

  abortController.abort();
  await heartbeatTask;
} catch (error) {
  console.error(
    JSON.stringify({
      event: "SIMULATOR_FATAL",
      message:
        error instanceof Error ? error.message : "Unknown simulator error",
    }),
  );
  abortController.abort();
  process.exitCode = 1;
}
