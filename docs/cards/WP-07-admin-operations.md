# WP-07 — Admin Operations

| Thuộc tính | Giá trị                             |
| ---------- | ----------------------------------- |
| Trạng thái | Partial shell/login                 |
| Tuần       | 4                                   |
| Ưu tiên    | High                                |
| Bề mặt     | `apps/admin`, API, shared contracts |

## Outcome

Quản trị viên chuẩn bị và giám sát hệ thống mà không thao tác trực tiếp database.

## Scope

- Login/session guard.
- Dashboard tổng quan.
- Person và RFID lifecycle.
- Face enrollment progress/retry/re-enroll.
- Access Grant editor.
- Access Point và Device monitoring.
- Access Event filters và session timeline.

Không bao gồm public landing, customer portal hoặc mở cửa từ Internet.

## Routes mục tiêu

```text
/login
/dashboard
/people
/people/:id
/people/:id/face-enrollment
/access-grants
/access-points
/devices
/access-events
```

## UI rules

- `page.tsx` mỏng; feature nằm trong `src/views`.
- Không dùng mock data khi card chuyển Done.
- Có loading, empty, error, forbidden và offline states.
- Timestamp hiển thị timezone.
- Không optimistic-update revoke card/grant hoặc biometric enrollment.
- Không trả/hiển thị embedding và Device secret.

## Tasks

| ID       | Task                                       | Trạng thái |
| -------- | ------------------------------------------ | ---------- |
| WP07-001 | Admin shell, login và design tokens        | Done       |
| WP07-002 | Session guard/logout/expiry                | Todo       |
| WP07-003 | People/RFID views                          | Todo       |
| WP07-004 | Face enrollment view                       | Todo       |
| WP07-005 | Access Grant editor                        | Todo       |
| WP07-006 | Device monitoring                          | Todo       |
| WP07-007 | Event table và decision/actuation timeline | Todo       |
| WP07-008 | Browser smoke/accessibility tests          | Todo       |

## Acceptance

- Setup Person hoàn chỉnh không cần DB tool.
- Enrollment lỗi có thông điệp hành động được.
- Dashboard dùng API thật.
- Event detail phân biệt Decision và Actuation.
- Browser smoke và responsive/accessibility checks pass.
