# WP-03 — Devices, Heartbeat and Authentication

| Thuộc tính | Giá trị                                         |
| ---------- | ----------------------------------------------- |
| Trạng thái | Partial — chờ DB/runtime verification           |
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
| WP03-001 | Chốt device-auth decision             | Done       |
| WP03-002 | Device credential repository và guard | Done       |
| WP03-003 | Heartbeat use case/endpoint           | Done       |
| WP03-004 | Online/offline policy và query        | Done       |
| WP03-005 | Token rotation/revocation             | Done       |
| WP03-006 | Auth/ownership negative tests         | Done       |

## Acceptance

- Unknown/disabled Device bị từ chối trước business flow.
- Secret không xuất hiện trong response/log.
- Heartbeat retry không tạo bản ghi dư.
- Offline threshold được cấu hình và test bằng fake clock.
- Device A không đọc/ACK session của Device B.

## Verification evidence

- D-013 được chốt tại [ADR-0005](../adr/0005-device-authentication.md): opaque bearer token 256 bit, bcrypt hash, `X-Device-Code` và rotation một lần hiển thị secret.
- Device API `POST /api/device/v1/heartbeat` yêu cầu contract version, device code và bearer token trước khi chạy use case.
- Admin API có registration, detail/list diagnostics, disable, credential rotation và Access Point create/list; token hash không nằm trong response model.
- Heartbeat chỉ update đúng Device row bằng server receive time; firmware timestamp được lưu riêng và không quyết định online.
- `DEVICE_OFFLINE_THRESHOLD_SECONDS` có validation và fake-clock boundary tests.
- Ownership guard kiểm tra `(sessionId, authenticated deviceId)` và negative test chứng minh Device A không truy cập session của Device B.
- Simulator gửi heartbeat bằng cùng shared endpoint/header constants và không log token.
- `prisma validate`, contract generation/check, lint, typecheck, 29 API tests và simulator build đã pass ngày 2026-11-22.

## Remaining verification

Docker daemon không chạy tại thời điểm triển khai nên migration `0003_wp03_device_auth_heartbeat`, seed và HTTP smoke-test trên PostgreSQL chưa chạy được. Sau khi Docker hoạt động:

```bash
pnpm infra:dev:up
pnpm prisma:migrate:dev
pnpm db:seed:dev
pnpm dev:api
DEVICE_TOKEN=development-device-token pnpm dev:simulator
```

Chuyển card sang `Done` sau khi heartbeat trả `204`, diagnostics/last-seen được lưu, token sai/cũ và Device disabled đều trả `401`. Poll/ACK thực tế sẽ gắn ownership guard khi WP-04 tạo các route session.
