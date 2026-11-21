# Project Context

## Product

Hệ thống kiểm soát một cửa xác thực RFID kết hợp khuôn mặt 1:1. NestJS là nguồn quyết định nghiệp vụ; Vision chỉ trả bằng chứng; ESP32 hoặc simulator chỉ gửi sự kiện và thực thi command hợp lệ.

## Canonical terms

- **Admin Account**: tài khoản quản trị, không phải người quẹt thẻ.
- **Person**: người được cấp quyền ra vào.
- **Auth Session**: một yêu cầu xác thực bắt đầu từ RFID.
- **Decision**: ALLOWED/DENIED/EXPIRED do API lưu.
- **Actuation**: kết quả Device xử lý command, tách khỏi Decision.

## Constraints

- Fail closed khi API, Vision, camera hoặc quyền không sẵn sàng.
- `(deviceId, requestId)` idempotent.
- Không log hoặc hiển thị embedding.
- Chưa hardcode GPIO, threshold hoặc timeout chưa đo.
- Simulator và ESP32 dùng cùng Device API contract.

Chi tiết tại `docs/implementation-plan/`.
