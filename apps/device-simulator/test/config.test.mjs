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
