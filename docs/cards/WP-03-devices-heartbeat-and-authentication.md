# WP-03 — Devices, Heartbeat and Authentication

| Thuộc tính | Giá trị                                         |
| ---------- | ----------------------------------------------- |
| Trạng thái | Todo                                            |
| Tuần       | 2                                               |
| Ưu tiên    | Critical                                        |
| Bề mặt     | Device API, database, Admin, Simulator/Firmware |

## Outcome

Chỉ Device đã đăng ký mới gửi heartbeat hoặc truy cập session của chính nó; Admin quan sát được last-seen và diagnostics.

## Scope

- Device registration/disable/credential rotation.
- Token hoặc HMAC authentication theo decision D-013.
- Heartbeat idempotent với firmware, uptime, RSSI, reset reason và capabilities.
- Online/offline được suy ra ở server từ `last_seen_at`.
- Ownership guard cho session/poll/ACK.

Không coi online là bằng chứng thiết bị an toàn và không cho Device tự mở cửa.

## Target interface

```http
POST /api/device/v1/heartbeat
```

## Tasks

| ID       | Task                                  | Trạng thái |
| -------- | ------------------------------------- | ---------- |
| WP03-001 | Chốt device-auth decision             | Todo       |
| WP03-002 | Device credential repository và guard | Todo       |
| WP03-003 | Heartbeat use case/endpoint           | Todo       |
| WP03-004 | Online/offline policy và query        | Todo       |
| WP03-005 | Token rotation/revocation             | Todo       |
| WP03-006 | Auth/ownership negative tests         | Todo       |

## Acceptance

- Unknown/disabled Device bị từ chối trước business flow.
- Secret không xuất hiện trong response/log.
- Heartbeat retry không tạo bản ghi dư.
- Offline threshold được cấu hình và test bằng fake clock.
- Device A không đọc/ACK session của Device B.
