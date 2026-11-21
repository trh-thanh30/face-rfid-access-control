# Tuần 4 — Ứng dụng quản trị

## 1. Mục tiêu

Hoàn thiện giao diện giúp quản trị viên chuẩn bị dữ liệu, theo dõi thiết bị, đăng ký khuôn mặt và điều tra lịch sử mà không cần thao tác trực tiếp database.

## 2. Điều kiện bắt đầu

- API master data và access session ổn định.
- Enrollment và verification API đã chạy với Vision thật.
- Shared DTO/schema được xuất cho frontend.
- Có role tối thiểu cho Admin Account.

## 3. Kết quả bàn giao

- Dashboard trạng thái tổng quan.
- CRUD Person và quản lý RFID.
- Enrollment có hướng dẫn và progress.
- Access Grant theo cửa/ngày/giờ.
- Device online/offline và diagnostics.
- Access Event filter/detail có correlation ID.
- Loading, empty, error và permission states nhất quán.

## 4. Information architecture

```text
/login
/dashboard
/people
/people/:id
/people/:id/face-enrollment
/access-grants
/access-points
/devices
/access-events
/settings/recognition
```

Không tạo landing page hoặc customer-facing web trong MVP.

## 5. Kế hoạch từng ngày

### Ngày 1 — Shell, auth và API client

- [ ] `W4-01` App shell, sidebar, header và responsive navigation; Owner: Frontend.
- [ ] `W4-02` Auth provider chỉ khởi tạo trong Admin; Owner: Frontend.
- [ ] `W4-03` Typed API client và React Query keys; Owner: Frontend.
- [ ] `W4-04` Global error mapping từ reason code sang thông điệp Việt; Owner: Frontend.
- [ ] `W4-05` Route guard và unauthorized/forbidden states; Owner: Frontend.

### Ngày 2 — People, RFID và grants

- [ ] `W4-06` People table/search/filter/pagination; Owner: Frontend.
- [ ] `W4-07` Person create/edit/disable/detail; Owner: Frontend.
- [ ] `W4-08` Gắn, thay, vô hiệu hóa RFID với confirmation; Owner: Frontend.
- [ ] `W4-09` Access Grant editor theo Access Point và timezone; Owner: Frontend.
- [ ] `W4-10` Hiển thị rõ ca qua nửa đêm và validation conflict; Owner: Frontend + Backend.

### Ngày 3 — Face enrollment

- [ ] `W4-11` Kiểm tra Vision/camera readiness trước enrollment; Owner: Frontend.
- [ ] `W4-12` Hướng dẫn ánh sáng, vị trí và thay đổi góc mặt; Owner: Frontend + AI.
- [ ] `W4-13` Progress số mẫu hợp lệ/bị loại và lý do; Owner: Frontend.
- [ ] `W4-14` Cancel, timeout, retry và re-enroll confirmation; Owner: Frontend.
- [ ] `W4-15` Chỉ hiển thị template count/model version/quality summary, không hiển thị vector; Owner: Frontend.

### Ngày 4 — Devices, events và dashboard

- [ ] `W4-16` Device list với last seen, firmware, RSSI và capabilities; Owner: Frontend.
- [ ] `W4-17` Online/offline dựa trên server rule, không suy diễn tại mỗi component; Owner: Backend.
- [ ] `W4-18` Access Event table filter theo thời gian, Person, Device, result/reason; Owner: Frontend.
- [ ] `W4-19` Session detail ghép decision và actuation timeline; Owner: Frontend.
- [ ] `W4-20` Dashboard cards và cảnh báo gần nhất dùng API aggregation; Owner: Frontend + Backend.

### Ngày 5 — UX, tests và demo

- [ ] `W4-21` Keyboard navigation, labels, focus và contrast review; Owner: Frontend.
- [ ] `W4-22` Component tests cho form/mapper/state quan trọng; Owner: Frontend.
- [ ] `W4-23` Browser smoke: login → create Person → grant → enroll → event; Owner: cả nhóm.
- [ ] `W4-24` Test empty/error/offline/slow Vision states; Owner: cả nhóm.
- [ ] `W4-25` Ghi operator guide và evidence M3; Owner: Frontend.

## 6. Frontend structure

Giữ page/router mỏng, đặt UI feature trong `src/views`:

```text
apps/admin/src/
├── app/
├── components/common/
├── components/layout/
├── lib/api/
└── views/
    ├── dashboard/
    ├── people/
    ├── face-enrollment/
    ├── access-grants/
    ├── devices/
    └── access-events/
```

Domain DTO dùng chung ở package contracts. View-local state không đưa vào shared package.

## 7. UX rules

- Destructive/irreversible action cần confirmation và nêu đúng đối tượng.
- Server là nguồn trạng thái; không optimistic update cho disable card, revoke grant hoặc biometric enrollment.
- Mọi trang có loading, empty, error và retry state.
- Timestamp hiển thị timezone rõ ràng.
- Reason code giữ được trong detail để điều tra, bên cạnh bản dịch dễ hiểu.
- Không dùng màu làm tín hiệu duy nhất cho allowed/denied/offline.

## 8. Kiểm thử bắt buộc

- Login/logout/session expiry.
- Person form validation và duplicate RFID.
- Grant thường và grant qua nửa đêm.
- Enrollment success/no face/multiple faces/camera busy/timeout.
- Device offline threshold.
- Event filters và pagination giữ trong URL nếu phù hợp.
- Không có API response chứa full embedding ở browser network.
- Mobile/tablet layout đủ dùng cho demo.

## 9. Definition of Done

- [ ] Quản trị viên hoàn thành setup Person mà không dùng DB tool.
- [ ] Enrollment có progress và lỗi hành động được.
- [ ] Dashboard không dùng mock data.
- [ ] Event detail phân biệt decision và actuation.
- [ ] UI không lộ embedding hoặc device secret.
- [ ] Smoke test luồng chính pass.
- [ ] M3 được demo từ clean seeded environment.

## 10. Rủi ro và dự phòng

- Cố tái sử dụng UI domain booking: chỉ giữ primitives/layout, viết view theo access-control domain.
- Dashboard gây chậm: dùng endpoint aggregation nhỏ, không tải toàn bộ events về client.
- Enrollment preview phức tạp: ưu tiên progress/quality feedback; preview stream là optional nếu làm tăng rủi ro.
- Hai frontend app dư thừa: MVP chỉ giữ Admin.

## 11. Bằng chứng cần lưu

- Screenshot từng trang chính.
- Browser smoke output.
- Video setup Person và enrollment.
- Network capture chứng minh không trả embedding.
- Accessibility checklist.
