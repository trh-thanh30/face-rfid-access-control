# Evaluation summary — wp11-dry-run-v1

> Synthetic dry-run only; do not report as measured biometric performance.

## Locked threshold

Selected from **CALIBRATION only**: `0.7050`.

## Final TEST metrics

| Metric | Count | Denominator | Rate |
| --- | ---: | ---: | ---: |
| FAR | 1 | 4 | 25.00% |
| FRR | 1 | 4 | 25.00% |
| Biometric accuracy | 6 | 8 | 75.00% |
| Capture failure | 2 | 10 | 20.00% |
| Infrastructure failure | 0 | 10 | 0.00% |
| End-to-end accuracy | 7 | 10 | 70.00% |

Capture reasons: `{"NO_FACE":1,"LOW_QUALITY":1}`.

## Latency

| Span | N | Median (ms) | P95 (ms) | Max (ms) |
| --- | ---: | ---: | ---: | ---: |
| rfidToCreateMs | 10 | 36.5 | 41.55 | 42 |
| precheckMs | 10 | 18.5 | 20.55 | 21 |
| visionMs | 10 | 407.5 | 457.75 | 460 |
| decisionMs | 10 | 475 | 528.3 | 531 |
| commandToActuationMs | 4 | 45.5 | 47.85 | 48 |
| actuationToAckMs | 4 | 89.5 | 92.7 | 93 |
| endToEndMs | 10 | 480.5 | 667.85 | 671 |

## Functional tests

- PASS: 8/9
- PARTIAL: 1/9
- FAIL: 0/9

See `../limitations.md` before interpreting any result.
