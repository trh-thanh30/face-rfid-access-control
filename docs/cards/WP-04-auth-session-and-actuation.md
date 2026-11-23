# WP-04 — Auth Session, Decision and Actuation

| Thuộc tính | Giá trị                                                   |
| ---------- | --------------------------------------------------------- |
| Trạng thái | Partial — chờ DB concurrency/runtime verification         |
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
| WP04-001 | Session repository và transition policy | Done       |
| WP04-002 | Create-session use case với pre-check   | Done       |
| WP04-003 | FakeFaceVerifier adapter                | Done       |
| WP04-004 | Decision/event transaction              | Done       |
| WP04-005 | Stable command và poll ownership        | Done       |
| WP04-006 | Idempotent ACK và Actuation Event       | Done       |
| WP04-007 | Concurrent retry integration tests      | Partial    |

## Acceptance

- Hai request đồng thời cùng id tạo một logical session.
- Unknown card/disabled Person/no grant không gọi Vision.
- Poll lặp không sinh command mới.
- ACK lặp không sinh logical actuation mới.
- Correlation ID truy được toàn luồng.

## Verification evidence

- `POST/GET/ACK /api/device/v1/access-sessions` dùng contract-version guard, Device authentication và ownership guard.
- Session creation dựa trên unique `(device_id, request_id)`; atomic claim `PENDING → VERIFYING` đảm bảo một logical verifier invocation.
- RFID/Person/Grant được pre-check trước Vision và re-check trước khi tạo command.
- Fake Face Verifier hỗ trợ `allow`, `mismatch`, `camera_busy`, `timeout`; infrastructure failure không bị ghi thành biometric mismatch.
- Decision và command được ghi trong một transaction. Command có một row duy nhất theo `session_id` và poll chỉ trả command còn hạn/chưa ACK.
- ACK dùng atomic claim trên `acknowledged_at`; retry giống nhau là no-op, retry khác kết quả bị conflict.
- Decision/Actuation Event có `deduplication_key` riêng và cùng `correlation_id` với Auth Session.
- Không có door sensor thì `CONFIRMED` bị từ chối; phải dùng `APPLIED_UNCONFIRMED`.
- Transition, pre-check denial, concurrent retry, stable command, Fake Vision và ACK tests pass trong 43 API tests ngày 2026-11-23.

## Remaining verification

Docker daemon chưa chạy nên chưa thể apply migration `0004_wp04_session_orchestration` hoặc chạy concurrency test trên PostgreSQL thật. `WP04-007` chỉ có in-memory concurrency test và chưa đủ để chứng minh unique constraint/transaction dưới database contention.

Các giá trị `AUTH_SESSION_TTL_SECONDS`, `ACTUATION_COMMAND_TTL_SECONDS` và `ACTUATION_OPEN_DURATION_MS` hiện là cấu hình demo, chưa phải quyết định calibration D-012.

Sau khi Docker hoạt động, chạy migration/seed rồi gửi đồng thời hai request cùng `requestId`; chỉ chuyển card sang `Done` khi database có đúng một Auth Session, một Decision Event, tối đa một command và một Actuation Event sau ACK retry.
