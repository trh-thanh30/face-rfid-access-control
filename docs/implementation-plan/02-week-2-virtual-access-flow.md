# Tuần 2 — Luồng truy cập ảo end-to-end

## 1. Mục tiêu

Hoàn thành một vertical slice từ RFID event đến Access Event mà không cần ESP32 hoặc webcam. Device Simulator và Fake Vision phải dùng đúng ports/contracts dự kiến cho thiết bị thật.

## 2. Điều kiện bắt đầu

- Week 1 Definition of Done đã đạt.
- Session state, reason codes và device schemas đã được review.
- Seed có ít nhất một Person, một Device, một Access Point và các trường hợp quyền mẫu.

## 3. Kết quả bàn giao

- Simulator heartbeat và được hiển thị online/offline.
- Quét UID giả tạo đúng một Auth Session.
- Backend từ chối sớm thẻ/người/quyền không hợp lệ.
- Fake Vision hỗ trợ allow, mismatch, timeout và camera busy.
- Command hợp lệ được simulator thực thi một lần và ACK.
- Decision Event và Actuation Event được lưu tách biệt.

## 4. Luồng mục tiêu

```text
Simulator đọc UID
→ POST create session
→ API xác thực device/thẻ/người/quyền
→ Fake Vision trả evidence
→ API kết thúc ALLOWED hoặc DENIED
→ Simulator poll
→ nếu ALLOWED: kiểm tra command rồi mở cửa ảo
→ Simulator ACK
→ API ghi actuation event
```

## 5. Kế hoạch từng ngày

### Ngày 1 — Master data use cases

- [x] `W2-01` Person create/update/disable/list/get; Owner: Backend.
- [x] `W2-02` Gắn, thay và vô hiệu hóa RFID Credential; Owner: Backend.
- [x] `W2-03` Access Point và Device registration; Owner: Backend.
- [x] `W2-04` Access Grant theo ngày, giờ và timezone; Owner: Backend.
- [x] `W2-05` Unit test repository-independent cho các use case; Owner: Backend.

### Ngày 2 — Device authentication và sessions

- [x] `W2-06` Device credential/token validation; Owner: Backend.
- [x] `W2-07` Heartbeat cập nhật last-seen và diagnostics; Owner: Backend.
- [x] `W2-08` Create session với unique `(deviceId, requestId)`; Owner: Backend.
- [x] `W2-09` Poll chỉ cho Device sở hữu session; Owner: Backend.
- [ ] `W2-10` Test retry đồng thời không tạo hai session; Owner: Backend.

### Ngày 3 — Access orchestration

- [x] `W2-11` Pre-check thẻ, Person và Access Grant trước Vision; Owner: Backend.
- [x] `W2-12` Implement `FakeFaceVerifierAdapter`; Owner: AI.
- [x] `W2-13` Chuyển trạng thái hợp lệ và bảo vệ terminal states; Owner: Backend.
- [x] `W2-14` Tạo command trong transaction phù hợp sau khi kiểm tra quyền lần cuối; Owner: Backend.
- [x] `W2-15` Ghi reason code và correlation ID xuyên suốt; Owner: Backend.

### Ngày 4 — Device Simulator

- [ ] `W2-16` CLI chọn Device và UID fixture; Owner: Firmware/Frontend.
- [ ] `W2-17` Heartbeat loop không chặn access flow; Owner: Firmware/Frontend.
- [ ] `W2-18` Poll với timeout/backoff có giới hạn; Owner: Firmware/Frontend.
- [ ] `W2-19` Persist command ID trước khi mô phỏng actuator; Owner: Firmware/Frontend.
- [ ] `W2-20` ACK retry không tạo actuation event trùng; Owner: Backend + Firmware.

### Ngày 5 — Integration và demo

- [ ] `W2-21` Integration test happy path; Owner: cả nhóm.
- [ ] `W2-22` Test unknown card, disabled Person, no grant và face mismatch; Owner: cả nhóm.
- [ ] `W2-23` Test API timeout, session expiry và duplicate request; Owner: cả nhóm.
- [ ] `W2-24` Script/fixture reset demo state; Owner: Backend.
- [ ] `W2-25` Chạy demo từ clean database và lưu evidence; Owner: người trình bày.

## 6. Reason codes tối thiểu

- `UNKNOWN_CARD`
- `CARD_DISABLED`
- `PERSON_DISABLED`
- `NO_PERMISSION`
- `OUTSIDE_ALLOWED_TIME`
- `NO_FACE_PROFILE`
- `CAMERA_BUSY`
- `FACE_MISMATCH`
- `SESSION_EXPIRED`
- `DEVICE_ERROR`
- `INTERNAL_ERROR`

Reason code thuộc shared contract; UI text và firmware signal được ánh xạ riêng, không thay đổi mã máy.

## 7. Quy tắc command và ACK

- Command chỉ xuất hiện ở terminal result `ALLOWED` và chưa hết hạn.
- Poll lặp trả cùng `commandId`.
- Simulator bỏ qua command đã thấy hoặc hết hạn.
- ACK gồm `commandId`, `executionStatus`, `timestamp`, `errorCode?`.
- ACK trùng là idempotent.
- Không có cảm biến cửa thì status là `APPLIED_UNCONFIRMED`.
- `FAILED` hoặc `UNKNOWN` không thay decision từ `ALLOWED` thành `DENIED`; chúng tạo Actuation Event riêng.

## 8. Kiểm thử bắt buộc

| Case                     | Kỳ vọng                                        |
| ------------------------ | ---------------------------------------------- |
| Thẻ + mặt + quyền hợp lệ | Một decision ALLOWED, một command, một ACK     |
| UID lạ                   | Từ chối trước Vision, Person null trong log    |
| Person bị khóa           | Từ chối trước Vision                           |
| Ngoài giờ                | Từ chối với timezone đúng                      |
| Face mismatch            | DENIED, có evidence metadata                   |
| Retry cùng request ID    | Cùng session ID                                |
| Poll nhiều lần           | Cùng command ID                                |
| ACK nhiều lần            | Một logical actuation result                   |
| Command hết hạn          | Không mở cửa ảo, ACK lỗi/expired theo contract |
| API mất kết nối          | Simulator fail-safe, không tự cho phép         |

## 9. Definition of Done

- [ ] Software-only demo chạy không cần webcam/ESP32.
- [ ] Tất cả denial paths lưu reason code.
- [ ] Idempotency có integration test, không chỉ unit test.
- [ ] Correlation ID tìm được xuyên API, Vision fake và events.
- [ ] Access Event không bị sửa/xóa bởi cập nhật Person.
- [ ] Simulator không chứa logic quyết định quyền.
- [ ] M1 được quay hoặc chụp bằng chứng.

## 10. Rủi ro và dự phòng

- Xử lý bất đồng bộ quá phức tạp: dùng in-process job trước, giữ port để thay queue sau; không thêm BullMQ nếu chưa có nhu cầu đo được.
- Race condition khi retry: dựa vào unique constraint và transaction thay vì check-then-insert ở application.
- Timezone sai: lưu timezone trên grant/access point và test ca qua nửa đêm.
- Fake Vision quá đơn giản: mọi fake response phải dùng cùng schema và error taxonomy với Vision thật.

## 11. Bằng chứng cần lưu

- Log bốn correlation IDs đại diện allow/deny/retry/expired.
- Database rows cho session, command, decision event và actuation event.
- Video hoặc terminal recording của virtual door.
- Integration test report.
