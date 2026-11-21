# WP-11 — Evaluation and Reporting

| Thuộc tính | Giá trị                                                        |
| ---------- | -------------------------------------------------------------- |
| Trạng thái | Todo                                                           |
| Tuần       | 6                                                              |
| Ưu tiên    | Critical                                                       |
| Bề mặt     | Test protocol, Vision scores, latency, hardware, báo cáo đồ án |

## Outcome

Bộ số liệu tái lập được cho FAR, FRR, accuracy, capture failures, latency và hành vi lỗi, liên kết đúng code/model/config/firmware version.

## Scope

- Enrollment/calibration/test captures độc lập.
- Protocol và exclusion rules khóa trước final run.
- Genuine/impostor attempts và raw score export.
- Threshold selection trên calibration set.
- FAR/FRR/accuracy kèm counts và denominators.
- Median/P95/max latency và breakdown.
- TC-01 đến TC-09.
- Limitations/threats to validity.

## Metrics

```text
FAR = false accepts / impostor attempts
FRR = false rejects / genuine attempts
Accuracy = correct decisions / evaluated attempts
```

Phải tách `NO_FACE`, `MULTIPLE_FACES`, `LOW_QUALITY` và `FACE_MISMATCH` khi phân tích nguyên nhân.

## Tasks

| ID       | Task                                  | Trạng thái |
| -------- | ------------------------------------- | ---------- |
| WP11-001 | Chốt participants/attempts/conditions | Todo       |
| WP11-002 | Dataset split và anonymized IDs       | Todo       |
| WP11-003 | Calibration và threshold selection    | Todo       |
| WP11-004 | Final biometric run                   | Todo       |
| WP11-005 | Functional/fault test run             | Todo       |
| WP11-006 | Result-generation scripts             | Todo       |
| WP11-007 | Tables/charts/limitations cho báo cáo | Todo       |

## Acceptance

- Không tune threshold trên final test set.
- Raw observations không sửa tay; exclusions có reason.
- Kết quả được tạo bằng script.
- Báo cả counts, denominators và điều kiện đo.
- Thay camera/model/config tạo evaluation version mới, không trộn dữ liệu.
