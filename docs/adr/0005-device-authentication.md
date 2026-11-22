# ADR-0005 — Device Authentication in the Local Network

- Status: Accepted
- Date: 2026-11-22
- Decision ID: D-013

## Context

ESP32 và Device Simulator cần cùng một cơ chế xác thực cho heartbeat, session polling và ACK. Giải pháp phải triển khai được trong thời gian đồ án, hỗ trợ thu hồi/rotation và không phụ thuộc đồng hồ chính xác trên ESP32.

## Decision

Mỗi Device dùng một opaque bearer token ngẫu nhiên 256 bit và header `X-Device-Code`. API lưu bcrypt hash, không lưu token thô. Token chỉ được trả một lần khi đăng ký hoặc rotation; list/detail/heartbeat không bao giờ trả hoặc log secret.

API xác thực và kiểm tra trạng thái `ACTIVE` trước use case. Token rotation thay hash trong một transaction và vô hiệu token cũ ngay. Session routes dùng thêm ownership guard để Device chỉ đọc hoặc ACK session của chính nó.

Development có thể chạy HTTP trên localhost. Triển khai qua mạng phải đặt API sau TLS reverse proxy; bearer token không bảo vệ được khi truyền qua plaintext.

## Alternatives

- HMAC từng request: chống sửa payload tốt hơn nhưng cần canonical request, nonce/replay store và clock policy, vượt phạm vi MVP.
- Client certificate: mạnh hơn nhưng provisioning/rotation phức tạp với ESP32 và demo LAN.
- UID hoặc device code làm secret: bị loại vì đây là identifier công khai, entropy thấp.

## Consequences

- Firmware chỉ cần lưu device code và token trong secret provisioning/config, không hardcode vào source control.
- Database leak không làm lộ token thô; token ngẫu nhiên vẫn phải được rotate khi nghi ngờ.
- Không coi heartbeat hoặc token hợp lệ là bằng chứng thiết bị vật lý an toàn.
- HMAC hoặc mTLS có thể thay thế sau MVP mà không đổi business use cases phía sau `DeviceAuthenticationService`.
