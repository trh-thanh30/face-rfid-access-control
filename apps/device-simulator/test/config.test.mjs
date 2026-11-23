import assert from "node:assert/strict";
import test from "node:test";
import { URL } from "node:url";
import { loadConfig } from "../dist/config.js";

test("simulator scaffold declares an explicit device token requirement", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../src/config.ts", import.meta.url), "utf8"),
  );

  assert.match(source, /DEVICE_TOKEN/);
  assert.doesNotMatch(source, /development-device-token.*default/);
});

test("simulator timing configuration is typed and bounded", () => {
  const config = loadConfig({
    DEVICE_TOKEN: "test-token",
    SIMULATOR_POLL_INITIAL_MS: "100",
    SIMULATOR_POLL_MAX_MS: "800",
    SIMULATOR_ACK_MAX_ATTEMPTS: "3",
  });
  assert.equal(config.pollInitialDelayMs, 100);
  assert.equal(config.pollMaxDelayMs, 800);
  assert.equal(config.ackMaxAttempts, 3);
  assert.throws(
    () =>
      loadConfig({
        DEVICE_TOKEN: "test-token",
        SIMULATOR_ACK_MAX_ATTEMPTS: "0",
      }),
    /SIMULATOR_ACK_MAX_ATTEMPTS/,
  );
});

test("heartbeat sends authentication and contract headers without logging the token", async () => {
  const [client, entrypoint] = await Promise.all([
    import("node:fs/promises").then(({ readFile }) =>
      readFile(new URL("../src/heartbeat-client.ts", import.meta.url), "utf8"),
    ),
    import("node:fs/promises").then(({ readFile }) =>
      readFile(new URL("../src/index.ts", import.meta.url), "utf8"),
    ),
  ]);

  assert.match(client, /Authorization/);
  assert.match(client, /DEVICE_CODE_HEADER/);
  assert.match(client, /ACCESS_CONTRACT_VERSION_HEADER/);
  assert.doesNotMatch(entrypoint, /deviceToken/);
});
