# WP10 security test checklist

## Automated trong repo

- [x] Admin thiếu/sai JWT bị từ chối; account disabled/role claim sai làm JWT mất hiệu lực.
- [x] `ADMIN` bị chặn khỏi Device registration, rotation, disable và Access Point creation dành cho `SUPER_ADMIN`.
- [x] Device unknown/disabled/token sai bị trả cùng một lỗi.
- [x] Device không đọc/ACK session của Device khác.
- [x] Token rotation chỉ lưu bcrypt hash và token cũ mất hiệu lực theo repository update.
- [x] Login/Device auth failure bị giới hạn theo cửa sổ cấu hình và cảnh báo không chứa identifier/secret.
- [x] Vision internal endpoint từ chối thiếu/sai service bearer.
- [x] Production Vision từ chối development service token.
- [x] Face summary không trả embedding; xóa template đi qua use case/repository có audit actor/count.
- [x] API response đặt `no-store`, `nosniff`, deny framing và tắt `x-powered-by`.

## Manual/deployment gate

- [ ] Browser network capture không có embedding, device token hoặc Vision token.
- [ ] Log API/Vision/reverse proxy không có full RFID UID, Authorization header, frame hoặc embedding.
- [ ] API public dùng TLS; Vision/PostgreSQL không public và chỉ cho phép network identity cần thiết.
- [ ] CORS production chỉ có đúng Admin origin; kiểm tra preflight và origin lạ.
- [ ] Secret manager/provisioning thay toàn bộ development values; thử rotate/revoke.
- [ ] Backup encryption/IAM/lifecycle và restore drill đạt policy.
- [ ] Distributed rate limit/gateway alert được cấu hình nếu chạy nhiều API replica.
- [ ] Dependency/container/model provenance scan không có finding critical chưa xử lý.
- [ ] Báo cáo ghi rõ chưa có liveness và rủi ro photo/video spoof.
