# WP-12 — Demo, Operations and Handover

| Thuộc tính | Giá trị                                                 |
| ---------- | ------------------------------------------------------- |
| Trạng thái | Todo                                                    |
| Tuần       | 6                                                       |
| Ưu tiên    | High                                                    |
| Bề mặt     | Setup, demo, troubleshooting, backup, báo cáo, bàn giao |

## Outcome

Một thành viên không viết module vẫn dựng, vận hành, demo và giải thích được hệ thống; buổi bảo vệ có luồng chính và phương án dự phòng.

## Demo scenarios

1. Thẻ đúng + mặt đúng + còn quyền → ALLOWED → command → actuation.
2. Thẻ lạ → từ chối trước Vision.
3. Thẻ đúng + mặt khác → `FACE_MISMATCH`.
4. Person bị khóa hoặc ngoài giờ → từ chối trước Vision.
5. API/Vision/camera/network lỗi → cửa giữ đóng.
6. Retry cùng request ID → một logical decision/command.
7. Truy session từ Admin bằng correlation ID và giải thích Decision khác Actuation.

## Scope

- Clean setup guide và environment matrix.
- Migration/seed/backup/restore procedure.
- Admin operator guide.
- Vision model/config guide.
- Firmware flash, wiring và power checklist.
- Troubleshooting theo symptom.
- Demo reset script/data an toàn.
- Video dự phòng và handover checklist.

## Tasks

| ID       | Task                                | Trạng thái |
| -------- | ----------------------------------- | ---------- |
| WP12-001 | Thành viên khác clean-clone README  | Todo       |
| WP12-002 | Operator và troubleshooting guides  | Todo       |
| WP12-003 | Firmware flash/wiring guide         | Todo       |
| WP12-004 | Backup/restore validation           | Todo       |
| WP12-005 | Deterministic demo data/reset       | Todo       |
| WP12-006 | Full rehearsal và backup video      | Todo       |
| WP12-007 | Final acceptance checklist sign-off | Todo       |

## Acceptance

- Setup không cần thao tác ngầm ngoài tài liệu.
- Demo chạy từ trạng thái xác định, không sửa DB thủ công.
- Mỗi scenario có evidence và expected reason/status.
- Người trình bày giải thích được ranh giới API/Vision/Device.
- [Final acceptance checklist](../implementation-plan/09-final-acceptance-checklist.md) được hoàn tất hoặc có ngoại lệ được duyệt.
