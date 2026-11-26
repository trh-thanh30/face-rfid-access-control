# Protocol — synthetic dry-run

## Status

`DRY_RUN_ONLY`. Protocol final cần nhóm, người hướng dẫn và người phụ trách consent phê duyệt trước khi thu.

## Dry-run design

- 4 synthetic participant IDs; không có người thật hay ảnh thật.
- Enrollment, calibration và test capture IDs độc lập để kiểm tra split.
- Calibration: tối thiểu một genuine và một impostor valid score; threshold chọn bằng minimum balanced error, tie theo FAR thấp hơn rồi threshold cao hơn.
- Final test không tham gia chọn threshold.
- Capture failures `NO_FACE`, `MULTIPLE_FACES`, `LOW_QUALITY` không bị đổi thành `FACE_MISMATCH` và không nằm trong mẫu số biometric FAR/FRR.
- End-to-end metrics vẫn tính mọi attempt không bị exclude, để capture/infrastructure failure không bị che.
- Latency dùng server spans; percentile dùng linear interpolation.

## Final human run — cần chốt trước capture

| Item                                | Giá trị cần duyệt                                                       |
| ----------------------------------- | ----------------------------------------------------------------------- |
| Số participant                      | TBD; xác định bằng mục tiêu/phạm vi đồ án, không theo kết quả mong muốn |
| Genuine attempts/person/split       | TBD                                                                     |
| Impostor pairing/attempts/split     | TBD; không dùng cùng capture để tune và test                            |
| Camera/distance/lighting            | TBD từ hardware/model thật                                              |
| Consent và withdrawal procedure     | Bắt buộc theo `docs/security/biometric-data-policy.md`                  |
| Exclusion rules                     | Khóa trong config trước run                                             |
| Hardware repetitions/power evidence | TBD khi WP08 có board thật                                              |

Không có giá trị TBD nào được tự điền sau khi đã xem final labels/scores.
