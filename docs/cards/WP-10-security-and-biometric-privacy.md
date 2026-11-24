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

| ID       | Task                                    | Trạng thái                                              |
| -------- | --------------------------------------- | ------------------------------------------------------- |
| WP10-001 | Secret/env baseline và ignore rules     | Done                                                    |
| WP10-002 | Admin route/API authorization           | Done — live status + RBAC tests                         |
| WP10-003 | Device auth/rotation/ownership          | Done — negative tests                                   |
| WP10-004 | Vision network/service auth             | Partial — app controls done; ingress pending            |
| WP10-005 | Biometric retention/backup policy       | Partial — delete/audit + policy; infra evidence pending |
| WP10-006 | Attempt limiting/alert policy           | Partial — single-instance; distributed pending          |
| WP10-007 | Threat model và security test checklist | Done                                                    |

## Evidence

- `docs/security/threat-model.md` ghi trust boundaries, controls và residual risks.
- `docs/security/biometric-data-policy.md` chốt consent, deletion, backup/restore và retention.
- `docs/security/security-test-checklist.md` tách automated evidence khỏi deployment gate.
- API kiểm lại trạng thái/role Admin mỗi request; Device lifecycle mutations yêu cầu `SUPER_ADMIN`.
- Login và Device authentication có failure window/alert không log identifier hoặc secret.
- Vision service auth dùng constant-time comparison, TrustedHost và production-secret validation.
- Face Template có hard-delete endpoint qua use case/repository và Admin Audit Event.

WP10 vẫn Partial cho tới khi TLS/private-network, distributed rate limit và backup/KMS/restore evidence được xác nhận trên môi trường triển khai thật.

## Acceptance

- Negative authorization tests cho Admin và Device pass.
- Browser/network/log review không có embedding/secret.
- Backup/restore không mở rộng quyền truy cập biometric data.
- Limitations và residual risks xuất hiện trong báo cáo/bàn giao.
