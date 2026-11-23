# WP-07 — Admin Operations

| Thuộc tính | Giá trị                              |
| ---------- | ------------------------------------ |
| Trạng thái | Partial (browser/E2E runtime)         |
| Tuần       | 4                                    |
| Ưu tiên    | High                                 |
| Bề mặt     | `apps/admin`, API, shared contracts  |

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
| WP07-002 | Session guard/logout/expiry                | Done       |
| WP07-003 | People/RFID views                          | Done       |
| WP07-004 | Face enrollment view                       | Done       |
| WP07-005 | Access Grant editor                        | Done       |
| WP07-006 | Device monitoring                          | Done       |
| WP07-007 | Event table và decision/actuation timeline | Done       |
| WP07-008 | Browser smoke/accessibility tests          | Partial    |

## Implementation evidence

- Admin shell có responsive navigation, session guard, logout và tự chuyển login khi API trả 401.
- Dashboard dùng `/api/v1/admin/dashboard`, không còn số liệu mock; online/offline được backend tính theo heartbeat threshold.
- Hồ sơ Person quản lý RFID, enrollment summary/re-enroll và Access Grant mà không hiển thị UID hash, embedding hoặc device secret.
- Event read model hỗ trợ filter/pagination; session drawer tách rõ Decision và Actuation theo correlation ID.
- Route page giữ mỏng, toàn bộ feature UI nằm trong `apps/admin/src/views`; empty/loading/error/focus/reduced-motion states dùng chung.
- Typecheck, lint, design-token validation, API unit test và static route/accessibility smoke test đã pass. Browser E2E với database + Vision runtime chưa chạy trong workspace hiện tại.

## Acceptance

- Setup Person hoàn chỉnh không cần DB tool.
- Enrollment lỗi có thông điệp hành động được.
- Dashboard dùng API thật.
- Event detail phân biệt Decision và Actuation.
- Browser smoke và responsive/accessibility checks pass.
