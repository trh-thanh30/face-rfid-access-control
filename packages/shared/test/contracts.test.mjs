import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";
import {
  ACCESS_CONTRACT_VERSION,
  ACCESS_CONTRACT_VERSION_HEADER,
  ACCESS_REASON_CODES,
  ACTUATION_STATUSES,
  AUTH_SESSION_STATUSES,
  createAccessGrantSchema,
  createPersonSchema,
  createAccessPointSchema,
  registerDeviceSchema,
  createAccessSessionSchema,
  deviceHeartbeatSchema,
  isContractVersionCompatible,
  visionVerificationRequestSchema,
} from "../dist/index.js";

test("accepts a valid device heartbeat", () => {
  const result = deviceHeartbeatSchema.safeParse({
    deviceCode: "DOOR_01",
    timestamp: "2026-11-21T10:00:00+07:00",
    firmwareVersion: "0.1.0",
    uptimeSeconds: 10,
    rssi: -55,
    capabilities: {
      rfid: true,
      actuator: "VIRTUAL",
      doorSensor: false,
      indicators: true,
    },
  });

  assert.equal(result.success, true);
});

test("validates strict Admin person and grant inputs", () => {
  assert.equal(
    createPersonSchema.safeParse({
      code: "P001",
      fullName: "Demo Person",
      status: "client-must-not-select-status",
    }).success,
    false,
  );
  assert.equal(
    createAccessGrantSchema.safeParse({
      personId: "04cf12c2-4446-4c00-bebe-e0e9859de4bd",
      accessPointId: "34c87d34-cb0d-41fb-a4be-d08c19df183e",
      validFrom: "2026-11-23",
      validUntil: "2026-11-22",
      timeFrom: "08:00",
      timeUntil: "17:00",
      timezone: "Asia/Ho_Chi_Minh",
    }).success,
    false,
  );
});

test("validates Access Point and Device registration inputs", () => {
  assert.equal(
    createAccessPointSchema.safeParse({
      code: "DOOR_02",
      name: "Door 02",
      timezone: "Invalid/Timezone",
    }).success,
    false,
  );
  assert.equal(
    registerDeviceSchema.safeParse({
      accessPointId: "34c87d34-cb0d-41fb-a4be-d08c19df183e",
      deviceCode: "ESP32_DOOR_02",
      token: "client-must-not-supply-a-token",
    }).success,
    false,
  );
});

test("rejects a device-selected person even when the remaining payload is valid", () => {
  const result = createAccessSessionSchema.safeParse({
    deviceCode: "DOOR_01",
    requestId: "request-1",
    timestamp: "2026-11-21T10:00:00+07:00",
    rfidUid: "A1B2C3D4",
    firmwareVersion: "0.1.0",
    personId: "device-must-not-select-person",
  });

  assert.equal(result.success, false);
});

test("rejects a malformed RFID UID", () => {
  const result = createAccessSessionSchema.safeParse({
    deviceCode: "DOOR_01",
    requestId: "request-1",
    timestamp: "2026-11-21T10:00:00+07:00",
    rfidUid: "not-hex",
    firmwareVersion: "0.1.0",
  });

  assert.equal(result.success, false);
});

test("requires at least one face reference", () => {
  const result = visionVerificationRequestSchema.safeParse({
    sessionId: "04cf12c2-4446-4c00-bebe-e0e9859de4bd",
    correlationId: "correlation-1",
    deadline: "2026-11-21T10:00:03+07:00",
    minimumValidFrames: 3,
    threshold: 0.5,
    references: [],
  });

  assert.equal(result.success, false);
});

test("accepts only contract versions from the supported major", () => {
  assert.equal(isContractVersionCompatible("1.9.0"), true);
  assert.equal(isContractVersionCompatible("2.0.0"), false);
  assert.equal(isContractVersionCompatible("not-semver"), false);
});

test("keeps generated firmware constants aligned with shared contracts", async () => {
  const header = await readFile(
    new URL(
      "../../../firmware/esp32-access-device/include/generated/access_contracts.h",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    header,
    new RegExp(`kVersion\\[\\] = "${ACCESS_CONTRACT_VERSION}"`),
  );
  assert.match(header, new RegExp(ACCESS_CONTRACT_VERSION_HEADER));

  for (const value of [
    ...AUTH_SESSION_STATUSES,
    ...ACCESS_REASON_CODES,
    ...ACTUATION_STATUSES,
  ]) {
    assert.match(header, new RegExp(`"${value}"`));
  }
});

test("documents the active contract version and strict payloads in OpenAPI", async () => {
  const openapi = await readFile(
    new URL("../../../docs/api/openapi.yaml", import.meta.url),
    "utf8",
  );

  assert.match(openapi, new RegExp(`version: ${ACCESS_CONTRACT_VERSION}`));
  assert.match(openapi, new RegExp(`name: ${ACCESS_CONTRACT_VERSION_HEADER}`));
  assert.match(openapi, /additionalProperties: false/);
});
