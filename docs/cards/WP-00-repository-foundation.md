# WP-00 — Repository Foundation

| Thuộc tính | Giá trị                                                |
| ---------- | ------------------------------------------------------ |
| Trạng thái | Done (local verification)                              |
| Tuần       | 1                                                      |
| Ưu tiên    | Critical                                               |
| Bề mặt     | Workspace, API, Admin, Vision, Simulator, Firmware, CI |

## Outcome

Một monorepo access-control sạch, cài đặt được và có baseline kiểm chứng. Domain của base repo cũ không còn trong build graph; mỗi runtime có vị trí và công cụ build rõ ràng.

## Scope

- `apps/api`: NestJS + Prisma.
- `apps/admin`: Next.js Admin.
- `apps/vision`: FastAPI scaffold.
- `apps/device-simulator`: chương trình Node giả lập ESP32.
- `firmware/esp32-access-device`: PlatformIO scaffold; firmware không thuộc pnpm apps.
- PostgreSQL 16 + pgvector bằng Docker Compose.
- Root lint, typecheck, test, build và GitHub Actions.
- Environment example, seed development và health endpoints.

Không bao gồm access orchestration, AI model thật hoặc firmware GPIO.

## Interfaces hiện có

| Interface                  | Trạng thái | Mục đích                 |
| -------------------------- | ---------- | ------------------------ |
| `GET /api/v1/health/live`  | Current    | API liveness             |
| `GET /api/v1/health/ready` | Current    | Kiểm tra database        |
| `POST /api/v1/auth/login`  | Current    | Admin development login  |
| `GET /health` của Vision   | Current    | Vision liveness scaffold |

## Tasks

| ID       | Task                                      | Trạng thái |
| -------- | ----------------------------------------- | ---------- |
| WP00-001 | Selective fork và clean workspace         | Done       |
| WP00-002 | Khởi tạo schema/migration pgvector        | Done       |
| WP00-003 | Tạo deterministic development seed        | Done       |
| WP00-004 | Scaffold Admin/Vision/Simulator/Firmware  | Done       |
| WP00-005 | Đồng bộ env, Compose và CI                | Done       |
| WP00-006 | Chạy local verification và lưu evidence   | Done       |
| WP00-007 | Thành viên khác clone sạch và kiểm README | Todo       |

## Acceptance

- Migration `0001_access_control_foundation` áp dụng được trên database sạch.
- Seed tạo Admin và Device mẫu mà không chứa secret production.
- Health live/ready và login smoke pass.
- Root format, lint, typecheck, test và build pass.
- Các thư mục source archive/base cục bộ bị Git ignore.
- Evidence: [Week 1](../evidence/week-1/README.md).

## Lưu ý

`apps/device-simulator` chạy trên laptop nên là pnpm app. Firmware chạy trên ESP32 và dùng PlatformIO nên nằm ngoài `apps/` tại `firmware/`.
