import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AccessStateMachine } from "../dist/access-state-machine.js";
import { PersistentCommandStore } from "../dist/command-store.js";
import { runScenario } from "../dist/scenario-runner.js";

const deviceId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const commandId = "33333333-3333-4333-8333-333333333333";
const config = {
  apiUrl: "http://localhost:3000",
  deviceCode: "ESP32_DOOR_01",
  deviceToken: "test-token",
  firmwareVersion: "test",
  heartbeatIntervalMs: 10_000,
  pollInitialDelayMs: 100,
  pollMaxDelayMs: 400,
  pollTimeoutMs: 5_000,
  ackRetryDelayMs: 50,
  ackMaxAttempts: 3,
  stateFile: "unused",
  fixtureUids: {
    allowed: "04A1B2C3",
    denied: "FFFFFFFF",
    disabledPerson: "04DEAD01",
  },
};
const now = new Date("2026-11-23T03:00:00.000Z");
const allowed = {
  sessionId,
  correlationId: "44444444-4444-4444-8444-444444444444",
  status: "ALLOWED",
  expiresAt: "2026-11-23T03:01:00.000Z",
  allowed: true,
  command: {
    commandId,
    sessionId,
    deviceId,
    expiresAt: "2026-11-23T03:00:30.000Z",
    openDurationMs: 100,
  },
};

async function fixture(overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), "access-simulator-"));
  const stateFile = join(directory, "commands.json");
  let actuatorCalls = 0;
  const signals = [];
  const api = {
    createSession: async () => allowed,
    pollSession: async () => allowed,
    acknowledge: async () => undefined,
    ...overrides.api,
  };
  const actuator = {
    open: async () => {
      actuatorCalls += 1;
    },
    ...overrides.actuator,
  };
  const store = new PersistentCommandStore(stateFile);
  const machine = new AccessStateMachine(
    { ...config, stateFile, ...overrides.config },
    overrides.deviceId ?? deviceId,
    api,
    store,
    actuator,
    (signal, details) => signals.push({ signal, details }),
    overrides.now ?? (() => now),
    overrides.wait ?? (async () => undefined),
  );
  return {
    api,
    machine,
    store,
    stateFile,
    signals,
    actuatorCalls: () => actuatorCalls,
  };
}

test("duplicate scenario persists command before actuation and opens only once", async () => {
  let acknowledgements = 0;
  const setup = await fixture({
    api: { acknowledge: async () => void (acknowledgements += 1) },
  });
  const results = await runScenario(setup.machine, {
    scenario: "duplicate",
    uid: "04A1B2C3",
    requestId: "same-request",
  });

  assert.equal(setup.actuatorCalls(), 1);
  assert.equal(acknowledgements, 1);
  assert.ok(
    results.some((result) => result.outcome === "COMMAND_REPLAY_SKIPPED"),
  );
  const persisted = JSON.parse(await readFile(setup.stateFile, "utf8"));
  assert.equal(persisted.commands[commandId].status, "ACKED");
});

test("network error keeps the virtual door closed", async () => {
  const setup = await fixture({
    api: { createSession: async () => Promise.reject(new Error("offline")) },
  });
  const result = await setup.machine.run("04A1B2C3", "network-error");
  assert.equal(result.outcome, "NETWORK_ERROR");
  assert.equal(setup.actuatorCalls(), 0);
});

test("wrong-device and expired commands fail closed", async () => {
  const wrongDevice = await fixture({
    deviceId: "55555555-5555-4555-8555-555555555555",
  });
  assert.equal(
    (await wrongDevice.machine.run("04A1B2C3", "wrong-device")).outcome,
    "COMMAND_INVALID",
  );
  assert.equal(wrongDevice.actuatorCalls(), 0);

  const expired = await fixture({
    api: {
      createSession: async () => ({
        ...allowed,
        command: { ...allowed.command, expiresAt: "2026-11-23T02:59:59.000Z" },
      }),
    },
  });
  assert.equal(
    (await expired.machine.run("04A1B2C3", "expired")).outcome,
    "COMMAND_INVALID",
  );
  assert.equal(expired.actuatorCalls(), 0);
});

test("polling uses bounded exponential backoff", async () => {
  const waits = [];
  let pollCount = 0;
  const pending = {
    ...allowed,
    status: "PENDING",
    allowed: undefined,
    command: undefined,
  };
  const setup = await fixture({
    api: {
      createSession: async () => pending,
      pollSession: async () => {
        pollCount += 1;
        return pollCount === 1 ? { ...pending, status: "VERIFYING" } : allowed;
      },
    },
    wait: async (milliseconds) => void waits.push(milliseconds),
  });
  const result = await setup.machine.run("04A1B2C3", "polling");
  assert.equal(result.outcome, "ACKED");
  assert.deepEqual(waits.slice(0, 2), [100, 200]);
});

test("poll timeout is bounded and keeps the door closed", async () => {
  let currentTime = now.getTime();
  const pending = {
    ...allowed,
    status: "VERIFYING",
    allowed: undefined,
    command: undefined,
  };
  const setup = await fixture({
    config: { pollTimeoutMs: 250 },
    api: {
      createSession: async () => pending,
      pollSession: async () => pending,
    },
    now: () => new Date(currentTime),
    wait: async (milliseconds) => void (currentTime += milliseconds),
  });
  const result = await setup.machine.run("04A1B2C3", "timeout");
  assert.equal(result.outcome, "POLL_TIMEOUT");
  assert.equal(setup.actuatorCalls(), 0);
});

test("ACK retries are bounded and do not re-run the actuator", async () => {
  let attempts = 0;
  const waits = [];
  const setup = await fixture({
    api: {
      acknowledge: async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("temporary outage");
      },
    },
    wait: async (milliseconds) => void waits.push(milliseconds),
  });
  const result = await setup.machine.run("04A1B2C3", "ack-retry");
  assert.equal(result.outcome, "ACKED");
  assert.equal(attempts, 3);
  assert.equal(setup.actuatorCalls(), 1);
  assert.deepEqual(waits, [50, 50]);
});

test("interrupted reserved command is recovered as UNKNOWN without re-actuation", async () => {
  const setup = await fixture();
  await setup.store.reserve({ commandId, sessionId, deviceId, now });
  const recovered = await setup.store.recoverInterrupted(now);
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].acknowledgement.executionStatus, "UNKNOWN");
  assert.equal(setup.actuatorCalls(), 0);
});
