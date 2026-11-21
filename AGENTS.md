# Agent Workflow

## Required context

- Đọc `CONTEXT.md` và tài liệu tuần liên quan trong `docs/implementation-plan/` trước khi thay đổi.
- Backend theo controller → use case → repository → database.
- `app/**/page.tsx` của Admin phải mỏng và render view từ `src/views`.
- Contract dùng giữa nhiều app nằm ở `packages/shared` (`@access/shared`).
- Không copy source archive hoặc base repository vào workspace active; các thư mục `_legacy/` và `booking-system-base/` bị Git ignore.

## Architecture rules

- NestJS là nơi duy nhất ra quyết định cho phép/từ chối.
- Vision không nhận Person tùy ý từ Device.
- Device không gửi `allowed` hoặc tự chọn Person.
- Decision và actuation là hai sự kiện khác nhau.
- Mất dependency phải fail closed.

## Verification

Chạy theo mức phù hợp với thay đổi:

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
```
