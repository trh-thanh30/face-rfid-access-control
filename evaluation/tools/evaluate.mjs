import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CAPTURE_FAILURES = new Set(["NO_FACE", "MULTIPLE_FACES", "LOW_QUALITY"]);

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    if (values.length !== headers.length) throw new Error("Malformed CSV row");
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]]),
    );
  });
}

function splitCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

export function selectThreshold(calibration) {
  const valid = calibration.filter(
    (row) => row.captureOutcome === "VALID" && !row.excluded,
  );
  assertBothClasses(valid, "calibration");
  const scores = [...new Set(valid.map((row) => row.score))].sort(
    (a, b) => a - b,
  );
  const candidates = [0, 1];
  for (let index = 1; index < scores.length; index += 1) {
    candidates.push(round((scores[index - 1] + scores[index]) / 2));
  }
  const sweep = [...new Set(candidates)]
    .filter((value) => value >= 0 && value <= 1)
    .map((threshold) => ({ threshold, ...biometricMetrics(valid, threshold) }))
    .sort(
      (left, right) =>
        left.balancedErrorRate - right.balancedErrorRate ||
        left.far - right.far ||
        right.threshold - left.threshold,
    );
  return { threshold: sweep[0].threshold, sweep };
}

export function biometricMetrics(rows, threshold) {
  const genuine = rows.filter((row) => row.claimType === "GENUINE");
  const impostor = rows.filter((row) => row.claimType === "IMPOSTOR");
  assertBothClasses(rows, "metrics");
  const falseRejects = genuine.filter((row) => row.score < threshold).length;
  const falseAccepts = impostor.filter((row) => row.score >= threshold).length;
  const trueAccepts = genuine.length - falseRejects;
  const trueRejects = impostor.length - falseAccepts;
  const far = falseAccepts / impostor.length;
  const frr = falseRejects / genuine.length;
  return {
    threshold,
    genuineAttempts: genuine.length,
    impostorAttempts: impostor.length,
    trueAccepts,
    trueRejects,
    falseAccepts,
    falseRejects,
    far,
    frr,
    accuracy: (trueAccepts + trueRejects) / rows.length,
    balancedErrorRate: (far + frr) / 2,
  };
}

export function evaluateAttempts(rows, threshold) {
  const included = rows.filter((row) => !row.excluded);
  const valid = included.filter((row) => row.captureOutcome === "VALID");
  const biometric = biometricMetrics(valid, threshold);
  const captureReasons = {};
  let infrastructureFailures = 0;
  let correctSystemDecisions = 0;
  let genuineSystemSuccesses = 0;
  let impostorSystemRejections = 0;
  for (const row of included) {
    if (CAPTURE_FAILURES.has(row.captureOutcome)) {
      captureReasons[row.captureOutcome] =
        (captureReasons[row.captureOutcome] ?? 0) + 1;
    }
    if (row.captureOutcome === "INFRASTRUCTURE_ERROR")
      infrastructureFailures += 1;
    const allowed = row.captureOutcome === "VALID" && row.score >= threshold;
    const expectedAllowed = row.claimType === "GENUINE";
    if (allowed === expectedAllowed) correctSystemDecisions += 1;
    if (expectedAllowed && allowed) genuineSystemSuccesses += 1;
    if (!expectedAllowed && !allowed) impostorSystemRejections += 1;
  }
  const genuineTotal = included.filter(
    (row) => row.claimType === "GENUINE",
  ).length;
  const impostorTotal = included.length - genuineTotal;
  return {
    biometric,
    system: {
      totalAttempts: included.length,
      excludedAttempts: rows.length - included.length,
      correctDecisions: correctSystemDecisions,
      accuracy: ratio(correctSystemDecisions, included.length),
      genuineSuccesses: genuineSystemSuccesses,
      genuineAttempts: genuineTotal,
      genuineSuccessRate: ratio(genuineSystemSuccesses, genuineTotal),
      impostorRejections: impostorSystemRejections,
      impostorAttempts: impostorTotal,
      impostorRejectionRate: ratio(impostorSystemRejections, impostorTotal),
      captureFailures: Object.values(captureReasons).reduce(
        (sum, count) => sum + count,
        0,
      ),
      captureFailureRate: ratio(
        Object.values(captureReasons).reduce((sum, count) => sum + count, 0),
        included.length,
      ),
      captureFailureReasons: captureReasons,
      infrastructureFailures,
      infrastructureFailureRate: ratio(infrastructureFailures, included.length),
    },
  };
}

export function latencySummary(rows) {
  const columns = [
    "rfidToCreateMs",
    "precheckMs",
    "visionMs",
    "decisionMs",
    "commandToActuationMs",
    "actuationToAckMs",
    "endToEndMs",
  ];
  return Object.fromEntries(
    columns.map((column) => {
      const values = rows
        .map((row) => row[column])
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      return [column, summarize(values)];
    }),
  );
}

function summarize(values) {
  if (values.length === 0)
    return { count: 0, median: null, p95: null, max: null };
  return {
    count: values.length,
    median: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: values.at(-1),
  };
}

export function percentile(sortedValues, quantile) {
  if (sortedValues.length === 0) return null;
  const index = (sortedValues.length - 1) * quantile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  return round(
    sortedValues[lower] +
      (sortedValues[upper] - sortedValues[lower]) * (index - lower),
  );
}

async function run(directory) {
  const root = resolve(directory);
  const configText = await readFile(join(root, "config.json"), "utf8");
  const config = JSON.parse(configText);
  if (
    config.dataClassification !== "SYNTHETIC_DRY_RUN" &&
    config.status !== "LOCKED"
  ) {
    throw new Error(
      "Non-synthetic evaluation config must be LOCKED before analysis",
    );
  }
  if (!config.analysisTimestamp)
    throw new Error("analysisTimestamp is required");
  const participants = parseCsv(
    await readFile(join(root, "participants.csv"), "utf8"),
  );
  const attempts = parseCsv(await readFile(join(root, "attempts.csv"), "utf8"));
  const scores = parseCsv(await readFile(join(root, "raw-scores.csv"), "utf8"));
  const exclusions = parseCsv(
    await readFile(join(root, "exclusions.csv"), "utf8"),
  );
  const latency = parseCsv(await readFile(join(root, "latency.csv"), "utf8"));
  const functionalTests = parseCsv(
    await readFile(join(root, "functional-tests.csv"), "utf8"),
  );
  validateParticipants(participants);
  validateFunctionalTests(functionalTests);
  const joined = joinObservations(
    attempts,
    scores,
    exclusions,
    config,
    new Map(participants.map((row) => [row.participant_id, row])),
  );
  const calibration = joined.filter((row) => row.split === "CALIBRATION");
  const test = joined.filter((row) => row.split === "TEST");
  if (!calibration.length || !test.length)
    throw new Error("Both CALIBRATION and TEST splits are required");
  const selection = selectThreshold(calibration);
  const metrics = evaluateAttempts(test, selection.threshold);
  validateLatency(latency, new Set(test.map((row) => row.attemptId)));
  const latencyRows = latency
    .filter((row) =>
      test.some(
        (attempt) => attempt.attemptId === row.attempt_id && !attempt.excluded,
      ),
    )
    .map(mapLatency);
  const output = {
    evaluationVersion: config.evaluationVersion,
    dataClassification: config.dataClassification,
    warning:
      config.dataClassification === "SYNTHETIC_DRY_RUN"
        ? "Synthetic dry-run only; do not report as measured biometric performance."
        : undefined,
    thresholdSelection: {
      sourceSplit: "CALIBRATION",
      objective:
        "minimum balanced error; tie: lower FAR, then higher threshold",
      threshold: selection.threshold,
      calibrationMetrics: selection.sweep[0],
    },
    finalTest: metrics,
    latency: latencySummary(latencyRows),
    functionalTests: {
      total: functionalTests.length,
      passed: functionalTests.filter((row) => row.status === "PASS").length,
      partial: functionalTests.filter((row) => row.status === "PARTIAL").length,
      failed: functionalTests.filter((row) => row.status === "FAIL").length,
    },
    generatedAt: config.analysisTimestamp,
  };
  const resultsDirectory = join(root, "results");
  await mkdir(resultsDirectory, { recursive: true });
  await writeFile(
    join(resultsDirectory, "metrics.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
  await writeFile(
    join(resultsDirectory, "threshold-sweep.csv"),
    sweepCsv(selection.sweep),
  );
  await writeFile(
    join(resultsDirectory, "summary.md"),
    summaryMarkdown(output),
  );
  await writeFile(
    join(resultsDirectory, "score-distribution.svg"),
    scoreChart(test, selection.threshold),
  );
  await writeFile(
    join(resultsDirectory, "manifest.json"),
    await manifest(root, configText),
  );
  process.stdout.write(
    `Generated ${basename(root)} at threshold ${selection.threshold.toFixed(4)}\n`,
  );
}

function joinObservations(
  attempts,
  scores,
  exclusions,
  config,
  participantsById,
) {
  if (attempts.length === 0)
    throw new Error("At least one attempt is required");
  assertUnique(scores, "attempt_id", "score");
  assertUnique(exclusions, "attempt_id", "exclusion");
  const scoreByAttempt = new Map(
    scores.map((row) => [row.attempt_id, row.score]),
  );
  const exclusionByAttempt = new Map(
    exclusions.map((row) => [row.attempt_id, row]),
  );
  const ids = new Set();
  const joined = attempts.map((row) => {
    if (ids.has(row.attempt_id))
      throw new Error(`Duplicate attempt: ${row.attempt_id}`);
    ids.add(row.attempt_id);
    if (!participantsById.has(row.participant_id)) {
      throw new Error(`Unknown participant: ${row.participant_id}`);
    }
    const probe = participantsById.get(row.probe_participant_id);
    if (!probe)
      throw new Error(`Unknown probe participant: ${row.probe_participant_id}`);
    if (!["CALIBRATION", "TEST"].includes(row.split))
      throw new Error(`Invalid split: ${row.split}`);
    if (!["GENUINE", "IMPOSTOR"].includes(row.claim_type))
      throw new Error(`Invalid claim: ${row.claim_type}`);
    const isSameParticipant = row.participant_id === row.probe_participant_id;
    if ((row.claim_type === "GENUINE") !== isSameParticipant)
      throw new Error(`Claim/probe mismatch: ${row.attempt_id}`);
    const expectedCaptureId =
      row.split === "CALIBRATION"
        ? probe.calibration_capture_id
        : probe.test_capture_id;
    if (row.capture_id !== expectedCaptureId)
      throw new Error(`Capture leakage or mismatch: ${row.attempt_id}`);
    if (
      ![
        "VALID",
        "NO_FACE",
        "MULTIPLE_FACES",
        "LOW_QUALITY",
        "INFRASTRUCTURE_ERROR",
      ].includes(row.capture_outcome)
    ) {
      throw new Error(`Invalid capture outcome: ${row.capture_outcome}`);
    }
    const rawScore = scoreByAttempt.get(row.attempt_id);
    if (row.capture_outcome === "VALID" && rawScore === undefined)
      throw new Error(`Missing score: ${row.attempt_id}`);
    if (
      row.capture_outcome !== "VALID" &&
      rawScore !== undefined &&
      rawScore !== ""
    )
      throw new Error(`Capture failure has score: ${row.attempt_id}`);
    const exclusion = exclusionByAttempt.get(row.attempt_id);
    if (
      exclusion &&
      !config.predeclaredExclusionRules.includes(exclusion.rule_code)
    ) {
      throw new Error(
        `Exclusion rule was not predeclared: ${exclusion.rule_code}`,
      );
    }
    if (exclusion && !exclusion.reason)
      throw new Error(`Exclusion requires a reason: ${row.attempt_id}`);
    return {
      attemptId: row.attempt_id,
      participantId: row.participant_id,
      probeParticipantId: row.probe_participant_id,
      captureId: row.capture_id,
      split: row.split,
      claimType: row.claim_type,
      captureOutcome: row.capture_outcome,
      reasonCode: row.reason_code,
      score:
        rawScore === undefined || rawScore === ""
          ? null
          : scoreNumber(rawScore),
      excluded: Boolean(exclusion),
    };
  });
  for (const scoreId of scoreByAttempt.keys()) {
    if (!ids.has(scoreId)) throw new Error(`Orphan score: ${scoreId}`);
  }
  for (const exclusionId of exclusionByAttempt.keys()) {
    if (!ids.has(exclusionId))
      throw new Error(`Orphan exclusion: ${exclusionId}`);
  }
  return joined;
}

function validateParticipants(rows) {
  assertUnique(rows, "participant_id", "participant");
  const captureIds = new Set();
  for (const row of rows) {
    for (const field of [
      "enrollment_capture_id",
      "calibration_capture_id",
      "test_capture_id",
    ]) {
      if (!row[field]) throw new Error(`Missing ${field}`);
      if (captureIds.has(row[field]))
        throw new Error(`Capture split reused: ${row[field]}`);
      captureIds.add(row[field]);
    }
  }
}

function validateFunctionalTests(rows) {
  assertUnique(rows, "tc_id", "functional test");
  const expected = Array.from(
    { length: 9 },
    (_, index) => `TC-${String(index + 1).padStart(2, "0")}`,
  );
  for (const testId of expected) {
    const row = rows.find((item) => item.tc_id === testId);
    if (
      !row ||
      !["PASS", "PARTIAL", "FAIL"].includes(row.status) ||
      !row.evidence
    ) {
      throw new Error(`Missing functional evidence: ${testId}`);
    }
  }
}

function validateLatency(rows, testAttemptIds) {
  assertUnique(rows, "attempt_id", "latency row");
  for (const row of rows) {
    if (!testAttemptIds.has(row.attempt_id)) {
      throw new Error(
        `Latency does not reference a TEST attempt: ${row.attempt_id}`,
      );
    }
  }
}

function assertUnique(rows, field, label) {
  const values = new Set();
  for (const row of rows) {
    if (!row[field] || values.has(row[field]))
      throw new Error(`Duplicate ${label}: ${row[field]}`);
    values.add(row[field]);
  }
}

function mapLatency(row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "attempt_id") continue;
    const camel = key.replace(/_([a-z])/g, (_, character) =>
      character.toUpperCase(),
    );
    result[camel] = value === "" ? null : finiteNumber(value, key);
  }
  return result;
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0)
    throw new Error(`Invalid ${label}`);
  return number;
}

function scoreNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < -1 || number > 1) {
    throw new Error("Invalid score");
  }
  return number;
}

function assertBothClasses(rows, label) {
  if (
    !rows.some((row) => row.claimType === "GENUINE") ||
    !rows.some((row) => row.claimType === "IMPOSTOR")
  ) {
    throw new Error(`${label} requires genuine and impostor attempts`);
  }
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function sweepCsv(rows) {
  return (
    [
      "threshold,false_accepts,impostor_attempts,far,false_rejects,genuine_attempts,frr,accuracy,balanced_error_rate",
      ...rows.map((row) =>
        [
          row.threshold,
          row.falseAccepts,
          row.impostorAttempts,
          row.far,
          row.falseRejects,
          row.genuineAttempts,
          row.frr,
          row.accuracy,
          row.balancedErrorRate,
        ].join(","),
      ),
    ].join("\n") + "\n"
  );
}

function summaryMarkdown(output) {
  const biometric = output.finalTest.biometric;
  const system = output.finalTest.system;
  const percent = (value) =>
    value === null ? "N/A" : `${(value * 100).toFixed(2)}%`;
  return `# Evaluation summary — ${output.evaluationVersion}\n\n> ${output.warning ?? "Measured evaluation output."}\n\n## Locked threshold\n\nSelected from **CALIBRATION only**: \`${output.thresholdSelection.threshold.toFixed(4)}\`.\n\n## Final TEST metrics\n\n| Metric | Count | Denominator | Rate |\n| --- | ---: | ---: | ---: |\n| FAR | ${biometric.falseAccepts} | ${biometric.impostorAttempts} | ${percent(biometric.far)} |\n| FRR | ${biometric.falseRejects} | ${biometric.genuineAttempts} | ${percent(biometric.frr)} |\n| Biometric accuracy | ${biometric.trueAccepts + biometric.trueRejects} | ${biometric.genuineAttempts + biometric.impostorAttempts} | ${percent(biometric.accuracy)} |\n| Capture failure | ${system.captureFailures} | ${system.totalAttempts} | ${percent(system.captureFailureRate)} |\n| Infrastructure failure | ${system.infrastructureFailures} | ${system.totalAttempts} | ${percent(system.infrastructureFailureRate)} |\n| End-to-end accuracy | ${system.correctDecisions} | ${system.totalAttempts} | ${percent(system.accuracy)} |\n\nCapture reasons: \`${JSON.stringify(system.captureFailureReasons)}\`.\n\n## Latency\n\n| Span | N | Median (ms) | P95 (ms) | Max (ms) |\n| --- | ---: | ---: | ---: | ---: |\n${Object.entries(
    output.latency,
  )
    .map(
      ([name, value]) =>
        `| ${name} | ${value.count} | ${value.median ?? "N/A"} | ${value.p95 ?? "N/A"} | ${value.max ?? "N/A"} |`,
    )
    .join(
      "\n",
    )}\n\n## Functional tests\n\n- PASS: ${output.functionalTests.passed}/${output.functionalTests.total}\n- PARTIAL: ${output.functionalTests.partial}/${output.functionalTests.total}\n- FAIL: ${output.functionalTests.failed}/${output.functionalTests.total}\n\nSee \`../limitations.md\` before interpreting any result.\n`;
}

function scoreChart(rows, threshold) {
  const valid = rows.filter((row) => row.captureOutcome === "VALID");
  const dots = valid
    .map((row, index) => {
      const x = round(50 + row.score * 700);
      const y =
        row.claimType === "GENUINE"
          ? 70 + (index % 3) * 8
          : 150 + (index % 3) * 8;
      const color = row.claimType === "GENUINE" ? "#2563eb" : "#dc2626";
      return `<circle cx="${x}" cy="${y}" r="5" fill="${color}"><title>${row.attemptId}: ${row.score}</title></circle>`;
    })
    .join("");
  const thresholdX = 50 + threshold * 700;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="230" viewBox="0 0 800 230" role="img" aria-label="Synthetic score distribution"><rect width="800" height="230" fill="white"/><line x1="50" y1="195" x2="750" y2="195" stroke="#111"/><line x1="${thresholdX}" y1="35" x2="${thresholdX}" y2="195" stroke="#111" stroke-dasharray="5 4"/><text x="50" y="30" font-family="sans-serif" font-size="14">GENUINE (blue) / IMPOSTOR (red) — SYNTHETIC DRY-RUN</text><text x="${thresholdX + 4}" y="50" font-family="sans-serif" font-size="12">threshold ${threshold.toFixed(3)}</text><text x="35" y="215" font-family="sans-serif" font-size="12">0</text><text x="740" y="215" font-family="sans-serif" font-size="12">1</text>${dots}</svg>\n`;
}

async function manifest(root, configText) {
  const files = [
    "config.json",
    "protocol.md",
    "data-dictionary.md",
    "limitations.md",
    "participants.csv",
    "attempts.csv",
    "raw-scores.csv",
    "latency.csv",
    "exclusions.csv",
    "functional-tests.csv",
  ];
  const checksums = {};
  for (const file of files) {
    const content = await readFile(join(root, file));
    checksums[file] = createHash("sha256").update(content).digest("hex");
  }
  const outputFiles = [
    "results/metrics.json",
    "results/threshold-sweep.csv",
    "results/summary.md",
    "results/score-distribution.svg",
  ];
  const outputChecksums = {};
  for (const file of outputFiles) {
    const content = await readFile(join(root, file));
    outputChecksums[file] = createHash("sha256").update(content).digest("hex");
  }
  const codeRevision = await readGitRevision(process.cwd());
  return `${JSON.stringify(
    {
      codeRevision,
      worktreeNote:
        "codeRevision records HEAD; archive a final evaluation only from a clean committed worktree",
      configSha256: createHash("sha256").update(configText).digest("hex"),
      inputFiles: checksums,
      outputFiles: outputChecksums,
    },
    null,
    2,
  )}\n`;
}

async function readGitRevision(repositoryRoot) {
  try {
    const head = (
      await readFile(join(repositoryRoot, ".git", "HEAD"), "utf8")
    ).trim();
    if (!head.startsWith("ref: ")) return head;
    const reference = head.slice(5);
    try {
      return (
        await readFile(join(repositoryRoot, ".git", reference), "utf8")
      ).trim();
    } catch {
      const packed = await readFile(
        join(repositoryRoot, ".git", "packed-refs"),
        "utf8",
      );
      return (
        packed
          .split(/\r?\n/)
          .find((line) => line.endsWith(` ${reference}`))
          ?.split(" ")[0] ?? "WORKTREE_UNAVAILABLE"
      );
    }
  } catch {
    return "WORKTREE_UNAVAILABLE";
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const directory = process.argv[2];
  if (!directory)
    throw new Error("Usage: node evaluate.mjs <evaluation-directory>");
  await run(directory);
}
