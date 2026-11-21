# WP-01 — Domain Data and Shared Contracts

| Thuộc tính | Giá trị                                                 |
| ---------- | ------------------------------------------------------- |
| Trạng thái | Done                                                    |
| Tuần       | 1–2                                                     |
| Ưu tiên    | Critical                                                |
| Bề mặt     | Prisma, `@access/shared`, API, Admin, Simulator, Vision |

## Outcome

Một ngôn ngữ domain và contract duy nhất để API, Admin, Vision, Simulator và firmware không tự định nghĩa status/reason code khác nhau.

## Scope

- Models: Admin Account, Person, RFID Credential, Face Template, Access Point, Device, Access Grant, Auth Session, Actuation Command và Access Event.
- Shared enums: session status, reason code và actuation status.
- Zod schemas: heartbeat, create session, poll response, ACK và Vision verification.
- Examples hợp lệ/không hợp lệ và contract tests.
- Versioning policy cho Device/Vision contracts.

Không bao gồm CRUD/use case nghiệp vụ; các card sau sử dụng contract này.

## Rules

- Admin Account khác Person.
- Device không gửi `personId` hoặc `allowed`.
- Face Template khác model/dimension/pipeline không được so sánh.
- Access Event append-only và không cascade-delete theo Person.
- Terminal session không quay lại `VERIFYING`.
- Reason code là machine contract; bản dịch UI là mapping riêng.

## Tasks

| ID       | Task                                  | Trạng thái |
| -------- | ------------------------------------- | ---------- |
| WP01-001 | Schema và migration models cốt lõi    | Done       |
| WP01-002 | Shared status/reason constants        | Done       |
| WP01-003 | Device request/response schemas       | Done       |
| WP01-004 | Vision request/response schemas       | Done       |
| WP01-005 | Contract tests allow/reject examples  | Done       |
| WP01-006 | OpenAPI/generated firmware mapping    | Done       |
| WP01-007 | Contract compatibility/version policy | Done       |

## Acceptance

- `@access/shared` build độc lập và được Simulator/API sử dụng.
- Payload thừa như Device-supplied `personId` bị reject.
- Schema yêu cầu ít nhất một face reference khi verify.
- Prisma generate và migration pass với `vector(512)`.
- Contract change có rollout order cho mọi consumer.

## Verification evidence

- HTTP contract: [`docs/api/openapi.yaml`](../api/openapi.yaml).
- Version và rollout policy: [`docs/contracts/versioning.md`](../contracts/versioning.md).
- Firmware mapping được sinh từ shared constants bằng `pnpm contracts:generate`; CI chạy `pnpm contracts:check` để phát hiện drift.
- Contract tests tách riêng unknown-field, malformed UID, face reference, version compatibility và generated/OpenAPI alignment.
- Chạy `pnpm test:contracts`, `pnpm lint`, `pnpm check-types` và `pnpm build` trước khi xác nhận card.
