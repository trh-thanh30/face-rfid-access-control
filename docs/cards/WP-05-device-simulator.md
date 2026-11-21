# WP-05 — Device Simulator

| Thuộc tính | Giá trị                                              |
| ---------- | ---------------------------------------------------- |
| Trạng thái | Partial scaffold                                     |
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
| WP05-002 | Heartbeat client loop             | Todo       |
| WP05-003 | RFID fixture/interactive input    | Todo       |
| WP05-004 | Session create/poll state machine | Todo       |
| WP05-005 | Persistent command store          | Todo       |
| WP05-006 | Virtual actuator và ACK retry     | Todo       |
| WP05-007 | End-to-end scenario runner        | Todo       |

## Acceptance

- Software-only demo chạy từ clean seeded database.
- Simulator và API dùng schemas từ `@access/shared`.
- Retry/replay tests chứng minh không mở cửa ảo hai lần.
- Mất API giữ virtual door đóng và trả signal lỗi rõ.
