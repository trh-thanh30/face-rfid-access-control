# WP-09 — Integration Reliability and Fail-safe

| Thuộc tính | Giá trị                                             |
| ---------- | --------------------------------------------------- |
| Trạng thái | Todo                                                |
| Tuần       | 5                                                   |
| Ưu tiên    | Critical                                            |
| Bề mặt     | API, Vision, Simulator, firmware, database, network |

## Outcome

Toàn hệ thống giữ đúng quyết định và trạng thái vật lý khi retry, timeout, restart hoặc dependency failure.

## Failure matrix

| Failure                    | Hành vi bắt buộc                                       |
| -------------------------- | ------------------------------------------------------ |
| API/mạng không sẵn sàng    | Device giữ cửa đóng, báo network error                 |
| Vision/camera lỗi          | Session kết thúc từ chối/lỗi hạ tầng, không có command |
| Duplicate create request   | Trả cùng Auth Session                                  |
| Duplicate poll             | Trả cùng command                                       |
| Duplicate ACK              | Không tạo logical actuation mới                        |
| Command hết hạn/sai Device | Bỏ qua và audit reason                                 |
| Reboot sau persist command | Không mở lại command đã thấy                           |
| Không có door sensor       | `APPLIED_UNCONFIRMED`, không `CONFIRMED`               |

## Scope

- Correlation ID và structured logs.
- Transaction boundary cho Decision/Command/Event.
- Retry/backoff/deadline thống nhất.
- Session/camera concurrency.
- Command replay và ACK idempotency.
- Offline detection/recovery.
- Fault injection bằng Simulator trước, ESP32 thật sau.

## Tasks

| ID       | Task                                   | Trạng thái |
| -------- | -------------------------------------- | ---------- |
| WP09-001 | Chốt timeout/poll/retry config version | Todo       |
| WP09-002 | Correlation/latency spans              | Todo       |
| WP09-003 | Concurrent session/idempotency tests   | Todo       |
| WP09-004 | Vision/camera failure tests            | Todo       |
| WP09-005 | Command replay/reboot tests            | Todo       |
| WP09-006 | Offline detection/recovery tests       | Todo       |
| WP09-007 | Fault matrix evidence                  | Todo       |

## Acceptance

- TC-06 đến TC-09 chạy bằng automation hoặc procedure tái lập.
- Không failure path nào tự tạo `ALLOWED` hoặc mở cửa.
- Decision không bị sửa để che Actuation failure.
- Mỗi failure tìm được bằng correlation ID và reason code.
