# WP-04 — Auth Session, Decision and Actuation

| Thuộc tính | Giá trị                                                   |
| ---------- | --------------------------------------------------------- |
| Trạng thái | Todo                                                      |
| Tuần       | 2                                                         |
| Ưu tiên    | Critical                                                  |
| Bề mặt     | API orchestration, database, Vision port, Device contract |

## Outcome

Một RFID request tạo đúng một Auth Session, được quyết định bởi NestJS và tạo tối đa một command ổn định; Decision và Actuation có audit riêng.

## Main flow

```text
RFID request → authenticate Device → resolve card/Person/grant
→ invoke FaceVerifierPort → persist Decision
→ if ALLOWED, re-check grant and create command
→ Device poll → execute → ACK → persist Actuation Event
```

## Business rules

- `UNIQUE(deviceId, requestId)` là nguồn chống duplicate session.
- Retry create/poll trả cùng session/command.
- Session terminal không chạy Vision lại.
- Expired session/command luôn fail closed.
- `ALLOWED` không chứng minh cửa đã mở.
- Không có door sensor dùng `APPLIED_UNCONFIRMED`, không dùng `CONFIRMED`.
- Infrastructure failure khác biometric mismatch.

## Target interfaces

```http
POST /api/device/v1/access-sessions
GET  /api/device/v1/access-sessions/:sessionId
POST /api/device/v1/access-sessions/:sessionId/ack
```

## Tasks

| ID       | Task                                    | Trạng thái |
| -------- | --------------------------------------- | ---------- |
| WP04-001 | Session repository và transition policy | Todo       |
| WP04-002 | Create-session use case với pre-check   | Todo       |
| WP04-003 | FakeFaceVerifier adapter                | Todo       |
| WP04-004 | Decision/event transaction              | Todo       |
| WP04-005 | Stable command và poll ownership        | Todo       |
| WP04-006 | Idempotent ACK và Actuation Event       | Todo       |
| WP04-007 | Concurrent retry integration tests      | Todo       |

## Acceptance

- Hai request đồng thời cùng id tạo một logical session.
- Unknown card/disabled Person/no grant không gọi Vision.
- Poll lặp không sinh command mới.
- ACK lặp không sinh logical actuation mới.
- Correlation ID truy được toàn luồng.
