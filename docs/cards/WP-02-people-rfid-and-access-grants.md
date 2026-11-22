# WP-02 — People, RFID and Access Grants

| Thuộc tính | Giá trị                                |
| ---------- | -------------------------------------- |
| Trạng thái | Partial — chờ DB runtime verification  |
| Tuần       | 2                                      |
| Ưu tiên    | Critical                               |
| Bề mặt     | API, database, shared contracts, Admin |

## Outcome

Quản trị viên chuẩn bị được Person, thẻ RFID và quyền theo Access Point/ngày/giờ; backend có thể từ chối sớm trước khi gọi Vision.

## Scope

- Create/update/disable/list/detail Person.
- Gắn, thay và revoke RFID Credential.
- Tạo/update/revoke Access Grant.
- Kiểm tra grant theo timezone, ngày hiệu lực và ca qua nửa đêm.
- Audit thay đổi credential/grant.

Không bao gồm face enrollment, session orchestration hoặc mở cửa thủ công.

## Business rules

- Một UID hoạt động chỉ có một chủ hiện hành.
- Person hoặc card bị disable/revoke luôn bị từ chối.
- UID lưu dạng keyed hash/canonical representation; display hint không được dùng để xác thực.
- Grant phải thuộc đúng Access Point của Device.
- Quy tắc ca qua nửa đêm phải gắn với ngày bắt đầu, không suy diễn bằng so sánh giờ đơn giản.

## Target interfaces

| Method | Endpoint                              | Mục đích       |
| ------ | ------------------------------------- | -------------- |
| CRUD   | `/api/v1/people`                      | Quản lý Person |
| POST   | `/api/v1/people/:id/rfid-credentials` | Gắn thẻ        |
| PATCH  | `/api/v1/rfid-credentials/:id/revoke` | Thu hồi thẻ    |
| CRUD   | `/api/v1/access-grants`               | Quản lý quyền  |

## Tasks

| ID       | Task                                          | Trạng thái |
| -------- | --------------------------------------------- | ---------- |
| WP02-001 | Person repository/use cases/controllers/tests | Done       |
| WP02-002 | RFID canonicalization, hashing và lifecycle   | Done       |
| WP02-003 | Access Grant repository/use cases             | Done       |
| WP02-004 | Timezone và overnight policy tests            | Done       |
| WP02-005 | Shared Admin DTO/schemas                      | Done       |
| WP02-006 | Seed Person/grant test fixtures               | Done       |

## Acceptance

- Không cần Prisma trực tiếp trong controller.
- Duplicate active UID bị database/application từ chối.
- Disabled Person/card và invalid grant có reason code rõ.
- Boundary tests cho ngày đầu/cuối, timezone và qua nửa đêm pass.

## Verification evidence

- Person và Access Grant endpoints đi qua controller → use case → repository → Prisma.
- UID được canonicalize rồi HMAC-SHA256 bằng `RFID_HASH_KEY`; response/audit chỉ dùng display hint.
- Migration `0002_wp02_master_data` dùng partial unique index để mỗi UID chỉ có một credential `ACTIVE`, đồng thời cho phép cấp lại UID đã revoke.
- Credential và grant mutations ghi `admin_audit_event` trong cùng database transaction.
- `CheckAccessEligibilityUseCase` trả reason code ổn định cho unknown/revoked card, disabled Person, không có grant và ngoài giờ.
- Unit/contract tests cover timezone `Asia/Ho_Chi_Minh`, ngày đầu/cuối và ca qua nửa đêm gắn với ngày bắt đầu.
- `prisma validate`, format, lint, typecheck, test và production build đã pass ngày 2026-11-22.

## Remaining verification

Docker daemon không chạy tại thời điểm triển khai, nên chưa thể apply migration, chạy seed hai lần và smoke-test endpoint trên PostgreSQL thật. Sau khi Docker hoạt động, chạy:

```bash
pnpm infra:dev:up
pnpm prisma:migrate:dev
pnpm db:seed:dev
pnpm db:seed:dev
```

Chỉ chuyển card sang `Done` sau khi bốn lệnh trên pass và duplicate active UID bị PostgreSQL từ chối.
