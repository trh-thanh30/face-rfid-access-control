import assert from "node:assert/strict";
import test from "node:test";
import { runHeartbeatLoop } from "../dist/heartbeat-loop.js";
import { sendHeartbeat } from "../dist/heartbeat-client.js";

const deviceId = "11111111-1111-4111-8111-111111111111";
const config = {
  apiUrl: "http://localhost:3000",
  deviceCode: "ESP32_DOOR_01",
  deviceToken: "secret-token",
  firmwareVersion: "test",
  heartbeatIntervalMs: 10_000,
  pollInitialDelayMs: 100,
  pollMaxDelayMs: 400,
  pollTimeoutMs: 5_000,
  ackRetryDelayMs: 50,
  ackMaxAttempts: 3,
  stateFile: "unused",
  fixtureUids: { allowed: "AABB", denied: "CCDD", disabledPerson: "EEFF" },
};

test("heartbeat sends auth headers and returns authenticated device ID", async () => {
  let request;
  const fetchImplementation = async (url, init) => {
    request = { url, init };
    return {
      ok: true,
      status: 204,
      headers: {
        get: (name) => (name.toLowerCase() === "x-device-id" ? deviceId : null),
      },
    };
  };

  assert.equal(await sendHeartbeat(config, fetchImplementation), deviceId);
  assert.equal(request.init.headers.Authorization, "Bearer secret-token");
  assert.equal(request.init.headers["X-Device-Code"], config.deviceCode);
  assert.equal(request.url, "http://localhost:3000/api/device/v1/heartbeat");
});

test("heartbeat loop yields between heartbeats and can be aborted", async () => {
  const signal = { aborted: false };
  const signals = [];
  let sends = 0;
  await runHeartbeatLoop(config, signal, {
    send: async () => {
      sends += 1;
      return deviceId;
    },
    onSignal: (signal) => signals.push(signal),
    wait: async () => {
      signal.aborted = true;
      throw new Error("aborted");
    },
  });
  assert.equal(sends, 1);
  assert.equal(signals[0].type, "HEARTBEAT_OK");
});
