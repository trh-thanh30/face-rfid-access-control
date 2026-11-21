# Phạm vi và kiến trúc

## 1. Phạm vi MVP

MVP phục vụ mô hình một cửa trong mạng cục bộ, gồm:

- một ứng dụng quản trị;
- một NestJS API là nguồn quyết định nghiệp vụ;
- một PostgreSQL database có hỗ trợ lưu vector;
- một Python Vision Service;
- một camera hoạt động tại một thời điểm;
- một ESP32 hoặc Device Simulator;
- một đầu đọc RFID;
- một cơ cấu mở cửa bằng servo hoặc actuator tương đương;
- LED/còi và cảm biến cửa tùy khả năng phần cứng.

Ngoài phạm vi MVP: nhận dạng 1:N, mobile app, MQTT, triển khai cloud nhiều site, đồng bộ offline policy, chống giả mạo nâng cao, nhiều camera đồng thời và điều khiển mở cửa từ Internet.

## 2. Nền repository

Sử dụng `booking-system-base` theo kiểu selective fork.

Giữ lại:

- Turborepo và pnpm workspace;
- NestJS core, Prisma, PostgreSQL, auth và health check;
- cấu hình lint, typecheck, test, Docker và CI;
- UI primitives, hooks và shared package;
- shell của `platform-admin` để chuyển thành `apps/admin`.

Loại bỏ hoặc không mang sang:

- tenant, business, category, service và booking domain;
- landing page và signup business;
- email worker, Telegram, Stripe, S3/MinIO nếu chưa có use case;
- seed data, migration và environment secret của dự án cũ;
- `.git` và `node_modules` của base repo.

## 3. Kiến trúc tổng thể

```text
Admin ───────────────┐
                    ▼
ESP32/Simulator ──> NestJS API ──> PostgreSQL/pgvector
                    │
                    └───────────> Python Vision Service ──> Camera adapter
```

Trách nhiệm:

- **Admin**: chuẩn bị dữ liệu và quan sát trạng thái; không tự quyết định quyền.
- **NestJS**: xác thực thiết bị, kiểm tra thẻ/người/quyền, điều phối Vision, ra quyết định, phát command và ghi audit.
- **Vision**: thu nhận ảnh, đánh giá chất lượng, tạo embedding và trả bằng chứng sinh trắc học.
- **ESP32/Simulator**: gửi sự kiện RFID, poll phiên, thực thi command hợp lệ và ACK.
- **PostgreSQL**: nguồn dữ liệu bền vững; access event là append-only.

## 4. Ubiquitous language

| Thuật ngữ | Định nghĩa |
| --- | --- |
| Admin Account | Tài khoản đăng nhập hệ thống quản trị |
| Person | Người được hệ thống cấp hoặc từ chối quyền ra vào |
| RFID Credential | Thẻ đang hoặc từng liên kết với một Person |
| Face Template | Embedding khuôn mặt cùng phiên bản pipeline và metadata chất lượng |
| Access Point | Cửa hoặc điểm kiểm soát vật lý |
| Device | Bộ điều khiển ESP32 gắn với một Access Point |
| Access Grant | Quyền của Person tại Access Point trong phạm vi ngày/giờ |
| Auth Session | Một lần yêu cầu xác thực bắt đầu từ sự kiện đọc thẻ |
| Actuation Command | Lệnh có hạn sử dụng dành cho đúng Device và Session |
| Access Event | Sự kiện bất biến mô tả quyết định hoặc thực thi |

Không dùng chung `User` cho Admin Account và Person.

## 5. Trạng thái phiên

```text
PENDING → VERIFYING → ALLOWED
                    ├→ DENIED
                    └→ EXPIRED
```

Quy tắc:

- trạng thái kết thúc không quay lại `VERIFYING`;
- `UNIQUE(device_id, request_id)` trả lại phiên cũ khi retry;
- một camera chỉ phục vụ một phiên; phiên cạnh tranh nhận `CAMERA_BUSY`;
- ảnh phải được chụp sau khi phiên bắt đầu và trước khi hết hạn;
- `ALLOWED` không đồng nghĩa cửa đã mở;
- quyết định và thực thi được ghi thành hai loại event.

## 6. Ports và adapters

### Backend

- `FaceVerifierPort`: gọi Vision thật hoặc Fake Vision.
- `ClockPort`: thời gian hệ thống hoặc fake clock cho test.
- `PersonRepository`, `AccessGrantRepository`, `SessionRepository`.
- `DeviceAuthenticatorPort`: xác minh device token/signature.

### Vision

- `CameraProvider`: OpenCV webcam, fixture hoặc frame upload.
- `FaceEngine`: InsightFace hoặc fake engine cho unit test.
- `QualityEvaluator`: blur, brightness, pose và face count.

### Firmware

- `RfidReader`: MFRC522 hoặc fake reader.
- `DoorActuator`: servo, relay hoặc fake actuator.
- `DoorSensor`: reed switch hoặc no-sensor adapter.
- `Indicator`: LED/buzzer hoặc serial indicator.
- `CommandStore`: lưu command đã thấy để chống thực thi lặp.

## 7. API thiết bị tối thiểu

```http
POST /api/device/v1/heartbeat
POST /api/device/v1/access-sessions
GET  /api/device/v1/access-sessions/:sessionId
POST /api/device/v1/access-sessions/:sessionId/ack
```

Device gửi `deviceCode`, `requestId`, `timestamp`, RFID credential và metadata firmware. Device không được gửi `personId`, `allowed` hoặc tự chọn đối tượng xác minh.

Command tối thiểu có `commandId`, `sessionId`, `deviceId`, `expiresAt` và `openDurationMs`. ACK có `executionStatus` và mã lỗi, nhưng không được sửa ngược quyết định xác thực.

## 8. Mô hình dữ liệu cốt lõi

- `AdminAccount`
- `Person`
- `RfidCredential`
- `FaceTemplate`
- `AccessPoint`
- `Device`
- `AccessGrant`
- `AuthSession`
- `ActuationCommand`
- `AccessEvent`

Ràng buộc quan trọng:

- thẻ hoạt động chỉ có một chủ hiện hành;
- Face Template luôn có `modelVersion`, dimension và pipeline fingerprint;
- không cascade-delete Access Event theo Person;
- command chỉ thuộc một session/device;
- quyền qua nửa đêm phải có quy tắc ngày bắt đầu rõ ràng.

## 9. Quy tắc AI

- RFID chọn Person trước, sau đó xác minh 1:1.
- Enrollment thu 5–10 mẫu đạt chất lượng.
- Mỗi frame lấy similarity cao nhất trên các mẫu cùng Person/cùng model.
- Kết quả phiên là trung vị của các frame hợp lệ.
- `threshold`, `K_min` và timeout là cấu hình có phiên bản, được chọn bằng calibration data.
- Vision trả score/evidence; NestJS áp dụng policy cuối cùng.
- Không log embedding và không hiển thị embedding trên UI.
- Liveness chưa thuộc MVP và phải được ghi là giới hạn an toàn.

## 10. Nguyên tắc fail-safe

- Mất API, camera, quyền hoặc dữ liệu cần thiết: giữ cửa đóng.
- Command hết hạn hoặc dành cho Device khác: không thực thi.
- Không có door sensor: dùng `APPLIED_UNCONFIRMED`, không dùng `CONFIRMED`.
- Không coi heartbeat online là bằng chứng thiết bị an toàn.
- Không dùng UID RFID như bí mật duy nhất.

## 11. Quyết định phải trì hoãn đến khi có số đo

- GPIO và board profile cuối cùng;
- nguồn và dòng tải thực tế;
- góc servo và thời gian mở;
- camera, khoảng cách và ánh sáng chuẩn;
- threshold, `K_min`, session timeout và poll interval;
- có hoặc không có reed switch;
- chính sách lưu ảnh gốc.

Các mục này được quản lý tại [risk and decision log](./08-risk-and-decision-log.md).
