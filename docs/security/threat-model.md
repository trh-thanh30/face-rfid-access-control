# WP10 threat model

## Assets và trust boundaries

Assets chính: Admin credential/JWT, Device bearer token, Vision service token, RFID HMAC key, Face Templates, Decision/Actuation events và backups. Trust boundaries nằm giữa browser–API, Device–API, API–Vision, API–PostgreSQL và operator–backup storage.

| Threat                        | Control hiện có                                                                             | Residual risk / bước tiếp theo                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| RFID cloning/replay           | RFID chỉ chọn Person; vẫn cần face 1:1, grant và command expiry                             | UID có thể clone; không coi UID là secret                                                             |
| Replay Device request/command | `(deviceId, requestId)`, command ownership/expiry, persistent seen IDs                      | Thiết bị bị chiếm vật lý có thể mất token                                                             |
| Device token brute force/leak | Token ngẫu nhiên 256-bit, bcrypt hash, rotation/disable, attempt limit                      | HTTP LAN làm lộ bearer; production bắt buộc TLS reverse proxy                                         |
| Admin credential stuffing     | Generic login error, bcrypt, per-account failure window                                     | Limiter hiện in-memory/single instance; production nhiều replica cần Redis/gateway limit và IP signal |
| Stolen Admin JWT              | Expiry, account status/role được kiểm lại mỗi request, logout/401 clear client token        | Token ở `sessionStorage` vẫn chịu XSS; cần CSP/review dependency và cân nhắc HttpOnly cookie          |
| Cross-role privilege          | Device lifecycle/access-point mutation yêu cầu `SUPER_ADMIN`                                | Các nghiệp vụ Admin còn lại dùng role `ADMIN` hoặc `SUPER_ADMIN` theo MVP                             |
| Vision endpoint public        | Service bearer constant-time check, TrustedHost allowlist                                   | Host allowlist không thay firewall; chỉ expose Vision trên private network/loopback                   |
| Photo/video spoof             | RFID + face matching                                                                        | Chưa có liveness/anti-spoof; đây là limitation trọng yếu, không tuyên bố đã chống spoof               |
| Embedding/frame leakage       | Vector chỉ ở repository/internal Vision request; summary không chứa vector; không lưu frame | Process memory, DB admin và backup vẫn là privileged surfaces                                         |
| Database/backup theft         | Token hash, RFID HMAC, backup policy encryption/least privilege                             | Face Template không thể đổi như password; cần kiểm chứng KMS/IAM/retention thực tế                    |
| Log leakage                   | Structured logs chỉ dùng IDs/status/reason, không log token/UID/vector/frame                | Debug/proxy logs bên ngoài repo phải được review                                                      |
| Dependency/model compromise   | Model checksum/readiness và lock versions                                                   | Cần dependency/image scanning và provenance trong CI/deployment                                       |

## Fail-safe invariants

- Device/Vision/camera/auth failure không được tạo `ALLOWED` hoặc command mới.
- Decision đã lưu không bị sửa để che Actuation failure.
- Device không gửi `allowed` hoặc chọn Person; Vision không quyết định mở cửa.
- Mất dependency giữ cửa đóng. Emergency/manual release là cơ chế vật lý tách biệt.
