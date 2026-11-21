# WP-10 — Security and Biometric Privacy

| Thuộc tính | Giá trị                                                  |
| ---------- | -------------------------------------------------------- |
| Trạng thái | Partial                                                  |
| Tuần       | Xuyên suốt; review cuối Week 6                           |
| Ưu tiên    | Critical                                                 |
| Bề mặt     | Admin auth, Device auth, Vision, database, logs, backups |

## Outcome

Chỉ actor/service phù hợp truy cập dữ liệu cần thiết; UID và embedding không bị coi là secret tuyệt đối hoặc lộ qua UI/log.

## Scope

- Admin authentication/authorization và session lifecycle.
- Device credential rotation/revocation và session ownership.
- Internal-only Vision API/service credential.
- Rate/attempt controls và cảnh báo thất bại liên tiếp.
- Face Template access, backup, retention và deletion policy.
- Secret/environment handling.
- Threat model cho RFID cloning, replay, photo/video spoof và local-network attacker.

## Rules

- Không log full UID, token, embedding hoặc frame.
- Không gửi embedding đến browser.
- RFID UID không đủ để mở cửa.
- Ảnh gốc mặc định không lưu; ngoại lệ cần consent, purpose và retention.
- Liveness chưa triển khai phải được ghi là limitation, không được quảng cáo ngược lại.
- Development credential không dùng ngoài local.

## Tasks

| ID       | Task                                    | Trạng thái |
| -------- | --------------------------------------- | ---------- |
| WP10-001 | Secret/env baseline và ignore rules     | Done       |
| WP10-002 | Admin route/API authorization           | Todo       |
| WP10-003 | Device auth/rotation/ownership          | Todo       |
| WP10-004 | Vision network/service auth             | Todo       |
| WP10-005 | Biometric retention/backup policy       | Todo       |
| WP10-006 | Attempt limiting/alert policy           | Todo       |
| WP10-007 | Threat model và security test checklist | Todo       |

## Acceptance

- Negative authorization tests cho Admin và Device pass.
- Browser/network/log review không có embedding/secret.
- Backup/restore không mở rộng quyền truy cập biometric data.
- Limitations và residual risks xuất hiện trong báo cáo/bàn giao.
