# Checklist nghiệm thu cuối

Checklist này chỉ được đánh dấu sau khi có test/evidence. “Code đã viết” không tương đương “đã nghiệm thu”.

## 1. Repository và onboarding

- [ ] Repository không chứa `.env` thật, private key, device token hoặc dữ liệu khuôn mặt trái phép.
- [ ] Clean checkout cài đặt và chạy theo root README.
- [ ] Workspace chỉ chứa app/package có vai trò rõ.
- [ ] Lock files và runtime versions được ghi.
- [ ] Lint, typecheck, unit/integration tests và build pass.
- [ ] Docker/native split cho webcam được giải thích.

## 2. Backend và database

- [ ] Admin Account và Person là hai khái niệm riêng.
- [ ] CRUD Person/RFID/Access Point/Device/Grant hoạt động.
- [ ] Session state transitions được bảo vệ.
- [ ] `(deviceId, requestId)` idempotent dưới retry/concurrency.
- [ ] Poll trả stable command ID.
- [ ] ACK idempotent.
- [ ] Quyền được kiểm tra trước Vision và trước command.
- [ ] Access Event append-only và không cascade delete.
- [ ] Migration chạy từ database trống và version trước.
- [ ] Correlation ID truy được toàn luồng.

## 3. Vision

- [ ] Model/pipeline có version/checksum/fingerprint.
- [ ] Enrollment thu nhiều mẫu có quality metadata.
- [ ] Verification là 1:1 theo Person từ session.
- [ ] Reject template sai model/dimension.
- [ ] Camera lock và frame timestamps ngăn lẫn phiên.
- [ ] No-face/multiple-face/low-quality/busy/timeout được phân loại.
- [ ] Threshold dựa trên calibration data riêng.
- [ ] Embedding không xuất hiện trong UI/application log.
- [ ] Liveness limitation được ghi rõ.

## 4. Admin

- [ ] Auth guard và session expiry đúng.
- [ ] Quản trị Person, RFID và grant không cần DB tool.
- [ ] Enrollment có readiness, progress, cancel và lỗi rõ.
- [ ] Device page có last seen, online/offline và diagnostics.
- [ ] Event page lọc và hiển thị decision/actuation timeline.
- [ ] Timezone hiển thị rõ.
- [ ] Loading/empty/error/forbidden states đầy đủ.
- [ ] UI không lộ embedding/device secret.
- [ ] Browser smoke test pass.

## 5. Simulator và contracts

- [ ] Simulator dùng cùng Device API với ESP32.
- [ ] Heartbeat loop không chặn access flow.
- [ ] Simulator persist command ID trước virtual actuation.
- [ ] Allow, deny, timeout, retry, expired và network failure scenarios chạy được.
- [ ] Shared reason codes không bị copy lệch giữa component.
- [ ] Contract tests provider/consumer pass.

## 6. Firmware và phần cứng

- [ ] Board/part numbers và sơ đồ dây được lưu.
- [ ] GPIO nằm trong board profile.
- [ ] RfidReader/DoorActuator/DoorSensor/Indicator qua interfaces.
- [ ] UID normalization khớp backend.
- [ ] Wi-Fi reconnect và HTTP timeout/retry có giới hạn.
- [ ] Duplicate/expired/wrong-device command không thực thi.
- [ ] Seen command được persist theo policy đã công bố.
- [ ] Không có brownout/reset trong test lặp đã định nghĩa.
- [ ] Nếu không có door sensor, chỉ báo `APPLIED_UNCONFIRMED`.
- [ ] Mất API/Vision/network giữ cửa đóng.
- [ ] Có phương án mở thủ công khi bảo trì/mất nguồn.

## 7. Security và privacy

- [ ] Admin endpoints có authentication/authorization.
- [ ] Device endpoints xác thực thiết bị và ownership của session.
- [ ] Internal Vision API không public ngoài ý muốn.
- [ ] Secrets qua environment/secret mechanism, không hardcode.
- [ ] Rate limit/attempt policy được cân nhắc và ghi.
- [ ] Face data có access, backup và retention policy.
- [ ] Không coi RFID UID là yếu tố bí mật đủ mạnh.
- [ ] Fail-safe behavior được test bằng fault injection.

## 8. Evaluation

- [ ] Protocol và exclusion rules được khóa trước final run.
- [ ] Enrollment, calibration và test captures độc lập.
- [ ] FAR, FRR, accuracy có counts và denominators.
- [ ] Quality/capture failures tách khỏi face mismatch.
- [ ] Latency có median, P95, max và breakdown.
- [ ] TC-01 đến TC-09 có pass/fail và evidence.
- [ ] Raw data → results tái tạo bằng script.
- [ ] Code/model/config/firmware versions được liên kết.
- [ ] Limitations và threats to validity được báo trung thực.

## 9. Demo bảo vệ đồ án

- [ ] Có script chuẩn bị demo và dữ liệu giả an toàn.
- [ ] Demo một lượt allowed.
- [ ] Demo thẻ lạ hoặc Person bị khóa.
- [ ] Demo đúng thẻ nhưng sai mặt.
- [ ] Demo Device offline/API hoặc Vision lỗi giữ cửa đóng.
- [ ] Truy lại session bằng correlation ID trên Admin/log.
- [ ] Giải thích được vì sao ALLOWED khác cửa đã mở.
- [ ] Nêu rõ simulator/fake nào còn tồn tại nếu có.
- [ ] Có video dự phòng khi phần cứng gặp sự cố tại buổi bảo vệ.

## 10. Tài liệu bàn giao

- [ ] Root README cài đặt và vận hành.
- [ ] Kiến trúc và ERD cập nhật theo implementation thật.
- [ ] OpenAPI/device protocol.
- [ ] Vision model/config guide.
- [ ] Sơ đồ dây, board profile và firmware flashing guide.
- [ ] Admin operator guide.
- [ ] Backup/restore và troubleshooting.
- [ ] Evaluation protocol/results.
- [ ] Decision/risk log có trạng thái cuối.

## 11. Quy tắc chấp nhận cuối

Hệ thống chỉ được coi là hoàn tất khi:

1. M1–M5 đã đạt hoặc ngoại lệ được ghi rõ và duyệt;
2. không còn lỗi khiến cửa có thể mở khi thiếu bằng chứng/quyền;
3. demo chạy từ trạng thái được mô tả, không chỉnh DB thủ công;
4. kết quả báo cáo truy ngược được về raw data và config;
5. người không viết module có thể chạy và giải thích module ở mức vận hành.
