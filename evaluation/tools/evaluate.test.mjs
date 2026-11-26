import assert from "node:assert/strict";
import test from "node:test";
import {
  biometricMetrics,
  evaluateAttempts,
  latencySummary,
  parseCsv,
  percentile,
  selectThreshold,
} from "./evaluate.mjs";

const row = (claimType, score, split = "CALIBRATION") => ({
  attemptId: `${claimType}-${score}-${split}`,
  claimType,
  score,
  split,
  captureOutcome: "VALID",
  excluded: false,
});

test("threshold selection uses calibration rows supplied to it", () => {
  const calibration = [
    row("GENUINE", 0.8),
    row("GENUINE", 0.9),
    row("IMPOSTOR", 0.2),
    row("IMPOSTOR", 0.4),
  ];
  const { threshold } = selectThreshold(calibration);
  assert.equal(threshold, 0.6);

  const hostileTestScores = [
    row("GENUINE", 0.1, "TEST"),
    row("IMPOSTOR", 0.95, "TEST"),
  ];
  assert.equal(selectThreshold(calibration).threshold, threshold);
  assert.notEqual(selectThreshold(hostileTestScores).threshold, threshold);
});

test("threshold selection ignores predeclared exclusions", () => {
  const calibration = [
    row("GENUINE", 0.8),
    row("IMPOSTOR", 0.2),
    { ...row("IMPOSTOR", 0.99), excluded: true },
  ];
  assert.equal(selectThreshold(calibration).threshold, 0.5);
});

test("FAR, FRR and accuracy expose counts and denominators", () => {
  const metrics = biometricMetrics(
    [
      row("GENUINE", 0.9),
      row("GENUINE", 0.4),
      row("IMPOSTOR", 0.8),
      row("IMPOSTOR", 0.2),
    ],
    0.5,
  );
  assert.deepEqual(
    {
      falseAccepts: metrics.falseAccepts,
      impostorAttempts: metrics.impostorAttempts,
      falseRejects: metrics.falseRejects,
      genuineAttempts: metrics.genuineAttempts,
      far: metrics.far,
      frr: metrics.frr,
      accuracy: metrics.accuracy,
    },
    {
      falseAccepts: 1,
      impostorAttempts: 2,
      falseRejects: 1,
      genuineAttempts: 2,
      far: 0.5,
      frr: 0.5,
      accuracy: 0.5,
    },
  );
});

test("capture failures stay separate from biometric mismatch", () => {
  const attempts = [
    row("GENUINE", 0.9, "TEST"),
    { ...row("GENUINE", null, "TEST"), captureOutcome: "NO_FACE" },
    row("IMPOSTOR", 0.2, "TEST"),
    { ...row("IMPOSTOR", null, "TEST"), captureOutcome: "LOW_QUALITY" },
  ];
  const result = evaluateAttempts(attempts, 0.5);
  assert.equal(result.biometric.genuineAttempts, 1);
  assert.equal(result.biometric.impostorAttempts, 1);
  assert.equal(result.system.captureFailures, 2);
  assert.deepEqual(result.system.captureFailureReasons, {
    NO_FACE: 1,
    LOW_QUALITY: 1,
  });
});

test("latency reports interpolated median, P95 and max per span", () => {
  const result = latencySummary([
    { endToEndMs: 100 },
    { endToEndMs: 200 },
    { endToEndMs: 300 },
  ]);
  assert.deepEqual(result.endToEndMs, {
    count: 3,
    median: 200,
    p95: 290,
    max: 300,
  });
  assert.equal(percentile([10, 20], 0.5), 15);
});

test("CSV parser preserves quoted commas", () => {
  assert.deepEqual(parseCsv('id,note\nA1,"camera, left"\n'), [
    { id: "A1", note: "camera, left" },
  ]);
});
