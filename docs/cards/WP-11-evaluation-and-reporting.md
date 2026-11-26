# WP-11 — Evaluation and Reporting

| Thuộc tính | Giá trị                                                        |
| ---------- | -------------------------------------------------------------- |
| Trạng thái | Partial — evaluation tooling và synthetic dry-run hoàn tất     |
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

| ID       | Task                                  | Trạng thái                                                |
| -------- | ------------------------------------- | --------------------------------------------------------- |
| WP11-001 | Chốt participants/attempts/conditions | Partial — template có, thông số người thật còn TBD        |
| WP11-002 | Dataset split và anonymized IDs       | Partial — schema/dry-run có, final dataset chưa thu       |
| WP11-003 | Calibration và threshold selection    | Partial — thuật toán có, chưa có calibration thật         |
| WP11-004 | Final biometric run                   | Blocked — cần protocol, consent, model/camera thật        |
| WP11-005 | Functional/fault test run             | Partial — TC-01..08 software pass, TC-09 hardware pending |
| WP11-006 | Result-generation scripts             | Done                                                      |
| WP11-007 | Tables/charts/limitations cho báo cáo | Partial — synthetic output có, final report pending       |

## Acceptance

- Không tune threshold trên final test set.
- Raw observations không sửa tay; exclusions có reason.
- Kết quả được tạo bằng script.
- Báo cả counts, denominators và điều kiện đo.
- Thay camera/model/config tạo evaluation version mới, không trộn dữ liệu.

## Evidence hiện có

- Package tái lập: [`evaluation/wp11-dry-run-v1`](../../evaluation/wp11-dry-run-v1/README.md).
- Script phân tích và unit test: `evaluation/tools/evaluate.mjs`, `evaluate.test.mjs`.
- Script kiểm tra leakage cơ bản, orphan/duplicate row, exclusion rule, functional evidence và chọn threshold chỉ từ calibration.
- Output gồm confusion counts, FAR/FRR/accuracy, capture/infrastructure failure, median/P95/max latency, threshold sweep, SVG và manifest SHA-256.

Các số trong package là **synthetic dry-run**, chỉ chứng minh pipeline chạy đúng. Không được đưa vào báo cáo như hiệu năng đo được. WP11 chỉ chuyển `Done` sau final run với người tham gia thật và hardware evidence phù hợp.
