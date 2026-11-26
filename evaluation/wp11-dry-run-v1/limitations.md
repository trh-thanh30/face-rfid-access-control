# Limitations and threats to validity

## Dry-run hiện tại

- Toàn bộ participant, score và latency là dữ liệu tổng hợp để kiểm tra pipeline; không phải phép đo hiệu năng của hệ thống.
- Chỉ có bốn participant giả lập nên không thể suy rộng FAR, FRR hoặc accuracy cho người dùng thật.
- Không có ảnh, camera, detector, embedding model hoặc biến thiên ánh sáng/khoảng cách thật.
- Không kiểm tra presentation attack, liveness, demographic bias hoặc nhiều người đồng thời.
- Latency tổng hợp không đại diện CPU, mạng, Vision service, ESP32, relay hoặc cảm biến cửa thật.
- `TC-09` mới có simulator evidence; actuator, door sensor, reboot và power stability trên board thật còn thiếu.

## Rủi ro của final run

- Mẫu nhỏ tạo bất định lớn; phải báo counts/denominators và tránh khẳng định tổng quát.
- Dùng lại capture giữa enrollment, calibration và test gây leakage.
- Xem test score rồi đổi threshold làm kết quả lạc quan giả tạo; khi xảy ra phải tạo evaluation version mới.
- Thay camera, model, pipeline, quality rule hoặc firmware giữa run làm dữ liệu không đồng nhất.
- Retry có chọn lọc hoặc exclusion sau khi xem kết quả tạo selection bias.
- Clock server và device lệch nhau; chỉ so span cùng clock hoặc ghi rõ phương pháp đồng bộ.
- Điều kiện phòng lab không phản ánh ánh sáng, góc mặt, che khuất và kết nối khi triển khai thật.

Các giới hạn này phải được giữ trong báo cáo cuối và cập nhật sau khi có hardware/human evidence; không được xóa chỉ vì final metrics tốt hơn.
