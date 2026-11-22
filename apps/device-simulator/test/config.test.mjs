import assert from "node:assert/strict";
import test from "node:test";
import { URL } from "node:url";

test("simulator scaffold declares an explicit device token requirement", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../src/config.ts", import.meta.url), "utf8"),
  );

  assert.match(source, /DEVICE_TOKEN/);
  assert.doesNotMatch(source, /development-device-token.*default/);
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
