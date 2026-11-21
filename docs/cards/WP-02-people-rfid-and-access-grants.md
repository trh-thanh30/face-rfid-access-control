# WP-02 — People, RFID and Access Grants

| Thuộc tính | Giá trị                                |
| ---------- | -------------------------------------- |
| Trạng thái | Todo                                   |
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
| WP02-001 | Person repository/use cases/controllers/tests | Todo       |
| WP02-002 | RFID canonicalization, hashing và lifecycle   | Todo       |
| WP02-003 | Access Grant repository/use cases             | Todo       |
| WP02-004 | Timezone và overnight policy tests            | Todo       |
| WP02-005 | Shared Admin DTO/schemas                      | Todo       |
| WP02-006 | Seed Person/grant test fixtures               | Todo       |

## Acceptance

- Không cần Prisma trực tiếp trong controller.
- Duplicate active UID bị database/application từ chối.
- Disabled Person/card và invalid grant có reason code rõ.
- Boundary tests cho ngày đầu/cuối, timezone và qua nửa đêm pass.
