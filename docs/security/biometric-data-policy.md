# Biometric data retention, backup và deletion policy

## Phạm vi dữ liệu

- Face Template embedding là dữ liệu sinh trắc học nhạy cảm dù không phải ảnh gốc.
- Ảnh/frame gốc mặc định chỉ tồn tại trong memory của Vision trong thời gian capture và không được lưu.
- API/browser chỉ nhận summary gồm số template, model/pipeline version, quality và thời điểm; không nhận embedding.

## Thu thập và quyền truy cập

- Chỉ thu enrollment sau khi có consent phù hợp với mục đích kiểm soát ra vào.
- Admin đã xác thực có thể enroll/xem summary/xóa; Device và browser không được đọc template vectors.
- Vision chỉ nhận references của Person đã được RFID/session xác định qua service bearer nội bộ.
- Không dùng template cho nhận dạng 1:N hoặc mục đích khác nếu chưa có consent mới.

## Retention và deletion

- Active templates tồn tại khi Person còn tham gia hệ thống và consent/mục đích còn hiệu lực.
- Re-enrollment làm template cũ inactive; inactive template phải được purge trong tối đa 30 ngày.
- `DELETE /api/v1/people/:personId/face-enrollments` hard-delete toàn bộ template hiện có và ghi `FACE_TEMPLATES_DELETED` vào Admin Audit Event với actor/count, không ghi vector.
- Yêu cầu rút consent, kết thúc tham gia hoặc sai dữ liệu phải gọi endpoint xóa, sau đó xử lý bản backup theo mục dưới.
- Access Event lịch sử có thể giữ decision metadata/score theo policy audit nhưng không chứa embedding/frame.

## Backup/restore

- Backup database phải mã hóa khi truyền và lưu, nằm trong tài khoản/bucket riêng, least privilege và có audit truy cập.
- Không copy production backup xuống laptop cá nhân hoặc môi trường demo. Test restore dùng dữ liệu synthetic/anonymized.
- Backup chứa Face Template có retention tối đa 30 ngày. Xóa backup theo lifecycle policy của storage, không bằng thao tác thủ công không kiểm chứng.
- Restore vào môi trường cô lập, khôi phục access controls trước khi mở network, rồi replay deletion ledger/audit xảy ra sau thời điểm backup trước khi đưa hệ thống phục vụ.
- Restore không được tạo tài khoản mới, đổi role hoặc mở quyền đọc vector cho browser/operator.

## Evidence vận hành còn cần

Trước production phải lưu cấu hình encryption/KMS, bucket IAM, lifecycle 30 ngày, restore drill và kết quả replay deletion. Repo chỉ triển khai application boundary; không thể chứng minh cấu hình cloud/NAS chưa được cung cấp.
