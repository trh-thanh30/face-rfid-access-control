# WP-05 — Device Simulator

| Thuộc tính | Giá trị                                              |
| ---------- | ---------------------------------------------------- |
| Trạng thái | Partial — chờ API/DB end-to-end verification         |
| Tuần       | 2                                                    |
| Ưu tiên    | High                                                 |
| Bề mặt     | `apps/device-simulator`, Device contracts, demo/test |

## Outcome

Chạy được luồng RFID → session → decision → virtual actuator → ACK trên laptop, không phụ thuộc ESP32. Simulator là client contract thật, không phải nơi chứa business policy.

## Vì sao nằm trong `apps/`?

Simulator là chương trình Node.js chạy trên máy phát triển, có `package.json` và tham gia pnpm/Turbo. Firmware chạy trên vi điều khiển nên nằm ở `firmware/` và dùng PlatformIO.

## Scope

- Typed environment và Device identity.
- Heartbeat loop không chặn.
- CLI/fixture chọn UID và failure scenario.
- Create session, bounded polling và expiry.
- Persistent seen-command store trước virtual actuation.
- ACK queue/retry.
- Scenarios: allowed, denied, timeout, duplicate và network error.

## Rules

- Không hardcode `allowed` theo UID.
- Không tự chọn Person.
- Không thực thi command sai Device, hết hạn hoặc đã thấy.
- Token chỉ lấy từ environment.
- Output log không in full credential/token.

## Tasks

| ID       | Task                              | Trạng thái |
| -------- | --------------------------------- | ---------- |
| WP05-001 | Package/config scaffold           | Done       |
| WP05-002 | Heartbeat client loop             | Done       |
| WP05-003 | RFID fixture/interactive input    | Done       |
| WP05-004 | Session create/poll state machine | Done       |
| WP05-005 | Persistent command store          | Done       |
| WP05-006 | Virtual actuator và ACK retry     | Done       |
| WP05-007 | End-to-end scenario runner        | Done       |

## Acceptance

- Software-only demo chạy từ clean seeded database.
- Simulator và API dùng schemas từ `@access/shared`.
- Retry/replay tests chứng minh không mở cửa ảo hai lần.
- Mất API giữ virtual door đóng và trả signal lỗi rõ.

## Verification evidence

- Config parse/bounds cho heartbeat, polling, ACK retry, state file và fixture UID; token bắt buộc từ environment.
- Heartbeat loop chạy độc lập với access attempt. Heartbeat trả `X-Device-Id` đã xác thực để simulator kiểm tra command target.
- CLI hỗ trợ fixture, custom UID, request ID và interactive mode; log chỉ chứa UID hint.
- Polling có exponential backoff, local/server deadline và không actuate khi timeout/network error.
- Persistent JSON store được ghi atomic trước actuator. Duplicate/replay command không mở cửa lần hai.
- Restart ở trạng thái `RESERVED/ACTUATING` chuyển thành ACK `UNKNOWN`, không thử mở lại cửa.
- Virtual actuator dùng `APPLIED_UNCONFIRMED`; ACK retry có giới hạn và ACK pending được flush ở lần khởi động sau.
- Tests cover duplicate, wrong Device, expired command, network error, polling timeout/backoff, crash recovery và ACK retry.
- Scenario `network-error` đã chạy thật ngày 2026-11-23: heartbeat/access đều báo lỗi và virtual door không mở.

## Remaining verification

Docker daemon chưa chạy nên chưa thể chạy scenario `allowed/denied/disabled-person/duplicate` với API và PostgreSQL thật từ clean seed. Vì vậy acceptance “software-only demo từ clean database” chưa có evidence và card chưa thể chuyển `Done`.
