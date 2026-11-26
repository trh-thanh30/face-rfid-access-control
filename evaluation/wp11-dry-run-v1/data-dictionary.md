# Data dictionary

Mọi ID trong dry-run là giả lập. Bản final phải dùng ID ẩn danh, không dùng họ tên, email hoặc UID thẻ làm participant ID.

## `participants.csv`

| Cột                      | Ý nghĩa                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `participant_id`         | ID người tham gia ẩn danh, duy nhất trong evaluation version |
| `enrollment_capture_id`  | ID lần thu dùng đăng ký                                      |
| `calibration_capture_id` | ID lần thu độc lập chỉ dùng calibration                      |
| `test_capture_id`        | ID lần thu độc lập chỉ dùng final test                       |
| `consent_status`         | Trạng thái consent; dry-run dùng `NOT_APPLICABLE_SYNTHETIC`  |

## `attempts.csv`

| Cột                    | Ý nghĩa                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `attempt_id`           | ID duy nhất của một lần thử đã lên kế hoạch                                                        |
| `participant_id`       | Participant được khai báo bởi RFID fixture                                                         |
| `probe_participant_id` | Participant xuất hiện trong probe; phải giống claimed participant với genuine và khác với impostor |
| `capture_id`           | Capture độc lập của probe, bắt buộc thuộc đúng calibration/test split                              |
| `split`                | `CALIBRATION` hoặc `TEST`                                                                          |
| `claim_type`           | `GENUINE` nếu đúng chủ thể, `IMPOSTOR` nếu khác chủ thể                                            |
| `capture_outcome`      | `VALID`, `NO_FACE`, `MULTIPLE_FACES`, `LOW_QUALITY` hoặc `INFRASTRUCTURE_ERROR`                    |
| `reason_code`          | Mã nguyên nhân gốc; không đổi capture failure thành face mismatch                                  |

## `raw-scores.csv`

| Cột          | Ý nghĩa                                                                |
| ------------ | ---------------------------------------------------------------------- |
| `attempt_id` | Tham chiếu attempt có capture `VALID`                                  |
| `score`      | Similarity score thô trong miền `[-1, 1]`; threshold chưa được áp dụng |

## `latency.csv`

Mỗi dòng tham chiếu một attempt thuộc `TEST`. Các trường thời gian dùng millisecond và lấy từ span đo được, không suy ra từ timestamp bị lệch clock.

| Cột                       | Span                                     |
| ------------------------- | ---------------------------------------- |
| `rfid_to_create_ms`       | RFID read → create-session received      |
| `precheck_ms`             | Pre-check bắt đầu → hoàn tất             |
| `vision_ms`               | Vision capture/verify bắt đầu → kết thúc |
| `decision_ms`             | Evidence sẵn sàng → decision persisted   |
| `command_to_actuation_ms` | Command received → actuator applied      |
| `actuation_to_ack_ms`     | Actuator applied → ACK persisted         |
| `end_to_end_ms`           | RFID read → ACK hoặc kết thúc attempt    |

## `exclusions.csv`

| Cột          | Ý nghĩa                                                     |
| ------------ | ----------------------------------------------------------- |
| `attempt_id` | Attempt bị loại khỏi phân tích                              |
| `rule_code`  | Rule đã khai báo trong config trước khi chạy                |
| `reason`     | Lý do quan sát được, bắt buộc và không được sửa label/score |

## `functional-tests.csv`

| Cột        | Ý nghĩa                                                 |
| ---------- | ------------------------------------------------------- |
| `tc_id`    | `TC-01` đến `TC-09` theo kế hoạch tuần 6                |
| `mode`     | Phương pháp kiểm tra: software, simulator hoặc hardware |
| `status`   | `PASS`, `PARTIAL` hoặc `FAIL`                           |
| `evidence` | Đường dẫn hoặc liên kết đến bằng chứng                  |
| `notes`    | Phạm vi đã kiểm tra và phần còn thiếu                   |
