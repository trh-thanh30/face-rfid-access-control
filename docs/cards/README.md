# Access Control Work Package Cards

Thư mục này chuyển [kế hoạch triển khai 6 tuần](../implementation-plan/README.md) thành các work package có thể giao độc lập cho thành viên trong nhóm. Card mô tả outcome, ranh giới, dependency, task kỹ thuật và điều kiện nghiệm thu; kế hoạch tuần vẫn là nguồn thứ tự triển khai.

## Nguồn sự thật

Khi tài liệu mâu thuẫn, dùng thứ tự:

1. `CONTEXT.md` và quyết định đã `Accepted` trong [decision log](../implementation-plan/08-risk-and-decision-log.md).
2. [Scope và architecture](../implementation-plan/00-scope-and-architecture.md).
3. Kế hoạch tuần trong `docs/implementation-plan/`.
4. Work package card trong thư mục này.
5. Task/issue con.

Không coi nội dung trong PDF hoặc card là bằng chứng một chức năng đã được triển khai. Trạng thái phải dựa trên code và verification evidence.

## Quy ước trạng thái

| Trạng thái | Ý nghĩa                                            |
| ---------- | -------------------------------------------------- |
| `Done`     | Code và verification phù hợp đã tồn tại            |
| `Partial`  | Có foundation nhưng chưa đạt acceptance end-to-end |
| `Todo`     | Chưa triển khai                                    |
| `Blocked`  | Có dependency thật sự ngăn tiếp tục                |

## Danh sách card

| Card                                                      | Work package                           | Tuần       | Trạng thái         | Phụ thuộc           |
| --------------------------------------------------------- | -------------------------------------- | ---------- | ------------------ | ------------------- |
| [WP-00](./WP-00-repository-foundation.md)                 | Repository foundation                  | 1          | Done (local)       | None                |
| [WP-01](./WP-01-domain-data-and-contracts.md)             | Domain data và shared contracts        | 1–2        | Done               | WP-00               |
| [WP-02](./WP-02-people-rfid-and-access-grants.md)         | Person, RFID và quyền ra vào           | 2          | Partial (DB check) | WP-01               |
| [WP-03](./WP-03-devices-heartbeat-and-authentication.md)  | Device, heartbeat và xác thực thiết bị | 2          | Todo               | WP-01               |
| [WP-04](./WP-04-auth-session-and-actuation.md)            | Auth Session, decision và command      | 2          | Todo               | WP-02, WP-03        |
| [WP-05](./WP-05-device-simulator.md)                      | Device Simulator end-to-end            | 2          | Partial            | WP-03, WP-04        |
| [WP-06](./WP-06-face-enrollment-and-verification.md)      | Vision enrollment và xác minh 1:1      | 3          | Partial            | WP-01, WP-04        |
| [WP-07](./WP-07-admin-operations.md)                      | Admin vận hành                         | 4          | Partial            | WP-02, WP-03, WP-06 |
| [WP-08](./WP-08-esp32-firmware-and-hardware.md)           | ESP32 firmware và phần cứng            | 5          | Partial scaffold   | WP-03, WP-04, WP-05 |
| [WP-09](./WP-09-integration-reliability-and-fail-safe.md) | Tích hợp, idempotency và fail-safe     | 5          | Todo               | WP-04, WP-06, WP-08 |
| [WP-10](./WP-10-security-and-biometric-privacy.md)        | Security và dữ liệu sinh trắc học      | Xuyên suốt | Partial            | WP-01..WP-09        |
| [WP-11](./WP-11-evaluation-and-reporting.md)              | FAR/FRR, latency và báo cáo            | 6          | Todo               | WP-06, WP-09        |
| [WP-12](./WP-12-demo-operations-and-handover.md)          | Demo, vận hành và bàn giao             | 6          | Todo               | WP-00..WP-11        |

## Dependency graph

```text
WP-00 → WP-01
WP-01 → WP-02 + WP-03
WP-02 + WP-03 → WP-04
WP-03 + WP-04 → WP-05
WP-01 + WP-04 → WP-06
WP-02 + WP-03 + WP-06 → WP-07
WP-03 + WP-04 + WP-05 → WP-08
WP-04 + WP-06 + WP-08 → WP-09
WP-01..WP-09 → WP-10
WP-06 + WP-09 → WP-11
WP-00..WP-11 → WP-12
```

## Nguyên tắc delivery

- NestJS là nguồn quyết định duy nhất; Vision chỉ trả bằng chứng và Device chỉ thực thi command.
- Simulator và ESP32 dùng chung Device API contract.
- `ALLOWED` không đồng nghĩa cửa đã mở; Decision và Actuation là hai event.
- Retry phải idempotent theo `(deviceId, requestId)` và stable `commandId`.
- Không hardcode GPIO, threshold hoặc timeout trước khi có phần cứng/số đo.
- Không log, hiển thị hoặc đưa embedding vào response frontend.
- Mất API, Vision, camera hoặc quyền phải fail closed.
- Card chỉ chuyển `Done` khi test/evidence đã được cập nhật.

## Quy ước task và branch

- Task ID: `WP<card>-<sequence>`, ví dụ `WP04-003`.
- Feature branch: `feat/WP04-auth-session`.
- Fix branch: `fix/WP09-command-replay`.
- Một PR nên tạo một vertical slice có thể kiểm chứng, không gom toàn bộ layer của nhiều card.

## Definition of Done chung

- Business rule nằm trong use case/domain, không nằm trong controller/view.
- Shared contract được cập nhật khi nhiều app cùng sử dụng.
- Migration/seed/environment docs được cập nhật nếu có thay đổi.
- Happy path, denial path và lỗi dependency quan trọng có test.
- `pnpm format:check`, lint, typecheck, test và build phần bị ảnh hưởng pass.
- Với Vision: Ruff/Pytest pass và model/config fingerprint được lưu.
- Với firmware: board profile, nguồn, command replay và failure evidence được lưu.
- Card, kế hoạch tuần và evidence thống nhất trạng thái.

## Ngoài phạm vi MVP

Nhận dạng 1:N, mobile app, MQTT, cloud multi-site, nhiều camera đồng thời, custom hardware fleet management, liveness nâng cao và điều khiển mở cửa từ Internet.
