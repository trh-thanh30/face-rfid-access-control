# Kế hoạch triển khai hệ thống kiểm soát ra vào

Tài liệu này là mục lục và bảng điều phối cho đồ án **kiểm soát ra vào bằng khuôn mặt kết hợp RFID và IoT**. Kế hoạch được xây dựng từ phạm vi của báo cáo đồ án, nhưng mọi thông số chưa được đo trên phần cứng thật đều được xem là giả định cần xác nhận.

## Mục tiêu

Xây dựng một hệ thống một cửa có thể:

- xác định danh tính khai báo từ thẻ RFID;
- xác minh khuôn mặt 1:1 với chủ thẻ;
- kiểm tra quyền theo cửa và thời gian;
- chỉ phát lệnh mở cửa khi mọi điều kiện hợp lệ;
- ghi tách biệt quyết định xác thực và kết quả thực thi vật lý;
- chạy end-to-end bằng simulator trước khi có phần cứng;
- thay simulator bằng ESP32 mà không thay hợp đồng backend.

## Roadmap

| Tuần | Trọng tâm              | Kết quả chạy được                                 | Trạng thái                |
| ---- | ---------------------- | ------------------------------------------------- | ------------------------- |
| 1    | Nền repo và contracts  | API health, Admin login, database, workspace sạch | Done (local verification) |
| 2    | Luồng truy cập ảo      | RFID giả → quyết định → cửa ảo → access log       | Not started               |
| 3    | Dịch vụ khuôn mặt      | Webcam/fixture xác minh 1:1 qua Vision API        | Not started               |
| 4    | Admin hoàn chỉnh       | Quản lý người, thẻ, quyền, thiết bị và lịch sử    | Not started               |
| 5    | Tích hợp phần cứng     | ESP32 thay simulator trên cùng API contract       | Not started               |
| 6    | Thử nghiệm và đánh giá | FAR/FRR, latency, test lỗi và số liệu báo cáo     | Not started               |

Trạng thái hợp lệ: `Not started`, `In progress`, `Blocked`, `Done`.

## Thứ tự đọc

1. [Phạm vi và kiến trúc](./00-scope-and-architecture.md)
2. [Tuần 1 — Nền repository](./01-week-1-repository-foundation.md)
3. [Tuần 2 — Luồng truy cập ảo](./02-week-2-virtual-access-flow.md)
4. [Tuần 3 — Dịch vụ nhận dạng khuôn mặt](./03-week-3-face-recognition-service.md)
5. [Tuần 4 — Ứng dụng quản trị](./04-week-4-admin-application.md)
6. [Tuần 5 — Tích hợp phần cứng](./05-week-5-hardware-integration.md)
7. [Tuần 6 — Thử nghiệm và đánh giá](./06-week-6-testing-and-evaluation.md)
8. [Quy trình làm việc nhóm](./07-team-workflow.md)
9. [Rủi ro và nhật ký quyết định](./08-risk-and-decision-log.md)
10. [Checklist nghiệm thu cuối](./09-final-acceptance-checklist.md)

## Các mốc bắt buộc

### M1 — Software-only demo

Hoàn thành cuối tuần 2. Không cần webcam hoặc ESP32. Simulator phải chứng minh được luồng cho phép, từ chối, retry và ghi lịch sử.

### M2 — Biometric demo

Hoàn thành cuối tuần 3. RFID vẫn có thể giả lập, nhưng xác minh khuôn mặt phải dùng pipeline thật với webcam hoặc fixture độc lập với ảnh đăng ký.

### M3 — Operator demo

Hoàn thành cuối tuần 4. Quản trị viên có thể chuẩn bị và quan sát toàn bộ dữ liệu vận hành từ Admin.

### M4 — Hardware demo

Hoàn thành cuối tuần 5. ESP32 thật sử dụng đúng contract mà simulator đã dùng.

### M5 — Evaluation package

Hoàn thành cuối tuần 6. Có cấu hình khóa, dữ liệu thô, cách tính chỉ số và bảng kết quả tái lập được.

## Quy tắc cập nhật kế hoạch

- Cập nhật checkbox và trạng thái ngay trong pull request thực hiện task.
- Thay đổi contract phải cập nhật backend, simulator, firmware và shared types trong cùng một nhánh hoặc một chuỗi PR có thứ tự rõ ràng.
- Thông số chưa đo không được chuyển thành quyết định đã chốt.
- Mọi blocker phần cứng được ghi trong [risk and decision log](./08-risk-and-decision-log.md); không chặn công việc simulator nếu contract chưa đổi.
- Cuối mỗi tuần, lưu bằng chứng demo, test output và quyết định mới vào `docs/evidence/week-N/` khi bắt đầu triển khai thực tế.

## Điều kiện bắt đầu viết code

- Phạm vi MVP được cả nhóm thống nhất.
- Tên domain trong tài liệu kiến trúc được chấp nhận.
- Có người phụ trách từng tuần và người review dự phòng.
- Quy tắc bảo vệ dữ liệu khuôn mặt được thống nhất.
- Tuần 1 chỉ bắt đầu sau khi tạo bản sao/fork an toàn từ base repo, không mang theo secret hoặc lịch sử Git ngoài ý muốn.
