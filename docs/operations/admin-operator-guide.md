# Admin Operator Guide

## Mục đích

Admin chuẩn bị Person, RFID, khuôn mặt và quyền cửa; theo dõi thiết bị và điều tra sự kiện. Admin UI không cung cấp nút mở cửa từ Internet.

## Thiết lập một Person

1. Đăng nhập tại `/login`, mở **Con người** và chọn **Tạo Person**.
2. Mở hồ sơ vừa tạo, nhập UID RFID. Xác nhận thay thẻ nếu Person đã có thẻ active.
3. Chọn **Bắt đầu** trong khuôn mặt. Đảm bảo một người trong khung, đủ sáng và giữ yên đến khi đủ 5 mẫu.
4. Chọn Access Point, ngày và giờ hiệu lực rồi cấp quyền. Giao diện đánh dấu riêng ca qua nửa đêm.
5. Không dùng database tool để hoàn tất luồng này.

## Xử lý lỗi enrollment

- `CAMERA_BUSY`: đợi phiên hiện tại kết thúc rồi thử lại.
- `NO_FACE`: đứng chính diện và kiểm tra camera.
- `MULTIPLE_FACES`: chỉ để một người trong khung hình.
- `LOW_QUALITY`: cải thiện ánh sáng, khoảng cách và giữ yên.
- `VISION_SERVICE_UNAVAILABLE`: kiểm tra `/ready`, model checksum và kết nối Vision.

Mẫu cũ chỉ bị vô hiệu hóa sau khi enrollment mới thành công.

## Theo dõi và điều tra

- **Thiết bị** dùng trạng thái online/offline do backend tính; không dựa vào đồng hồ trình duyệt.
- **Nhật ký** mở session timeline từ một event. `DECISION` là quyết định của NestJS; `ACTUATION` là kết quả thiết bị xử lý command.
- Session ALLOWED nhưng không có Actuation xác nhận cần được điều tra như lỗi thực thi, không được hiểu là cửa chắc chắn đã mở.
- Correlation ID dùng để ghép log API, Vision và Device mà không cần lộ dữ liệu sinh trắc học.

## Thu hồi

Thu hồi RFID, Access Grant hoặc vô hiệu hóa Person luôn yêu cầu xác nhận và chờ server trả thành công; UI không cập nhật lạc quan các thao tác này.
