# Week 1 verification evidence

Ngày kiểm tra: 2026-11-21, timezone Asia/Ho_Chi_Minh.

## Kết quả

| Kiểm tra            | Kết quả                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| `pnpm install`      | Pass; lockfile cập nhật cho 9 workspace projects                            |
| `pnpm lint`         | Pass cho 9 tasks                                                            |
| `pnpm check-types`  | Pass cho 9 tasks                                                            |
| `pnpm test`         | Pass: API 2 tests, shared contracts 3 tests, Admin 1 test, simulator 1 test |
| `pnpm build`        | Pass: API, Admin, simulator, shared/UI/hooks packages                       |
| Vision `ruff check` | Pass                                                                        |
| Vision `pytest`     | Pass: 1 test                                                                |
| Prisma migration    | `0001_access_control_foundation` applied successfully                       |
| Development seed    | Pass                                                                        |
| API liveness        | `status=ok`                                                                 |
| API readiness       | `database=up`                                                               |
| Admin login smoke   | Token returned for seeded `SUPER_ADMIN`                                     |

## Cleanup decision

Code booking/tenant đã được loại khỏi workspace active. `_legacy/` và `booking-system-base/` được thêm vào `.gitignore`; repository nguồn gốc được giữ độc lập bên ngoài project này.

## Chưa xác nhận độc lập

- `W1-03`/`W1-04`: không dùng build baseline của domain booking làm acceptance baseline; workspace access-control sạch được kiểm tra trực tiếp.
- `W1-25`: cần một thành viên khác clone repository sau commit đầu và chạy lại root README.
- GitHub Actions chưa chạy trên remote; các command tương đương đã pass cục bộ.

## Lưu ý môi trường

- Next/Turbopack production build cần chạy ngoài filesystem sandbox vì nó tạo process/port nội bộ.
- Vision được kiểm tra trên Python 3.14.3 dù project yêu cầu tối thiểu Python 3.11.
- PostgreSQL sử dụng image `pgvector/pgvector:pg16`.
