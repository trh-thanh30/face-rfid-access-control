# Tuần 1 — Nền repository và contracts

## 1. Mục tiêu

Tạo repository sạch từ `b `, giữ lại hạ tầng có giá trị và loại bỏ domain cũ. Cuối tuần, toàn bộ nhóm chạy được cùng một môi trường và có contract ổn định để phát triển song song.

## 2. Điều kiện bắt đầu

- Đã duyệt [phạm vi và kiến trúc](./00-scope-and-architecture.md).
- Xác nhận có quyền tái sử dụng base repo.
- Ba thành viên thống nhất Node, pnpm, Python và Docker versions.
- Có quy ước tên environment variable và port.

## 3. Kết quả bàn giao

- Monorepo chạy được bằng một hướng dẫn thống nhất.
- `apps/api`, `apps/admin`, `apps/vision`, `apps/device-simulator`, `firmware` tồn tại đúng vai trò.
- API health và Admin login hoạt động.
- PostgreSQL/pgvector khởi động được.
- Shared reason codes, session states và API schemas có test.
- Không còn secret hoặc domain booking chạy trong build graph.

## 4. Kế hoạch từng ngày

### Ngày 1 — Inventory và selective fork

- [x] `W1-01` Lập danh sách file/package giữ, sửa và loại bỏ; Owner: Backend; Review: cả nhóm.
- [x] `W1-02` Copy base mà không lấy `.git`, `node_modules`, `.env*` chứa giá trị thật; Owner: Backend.
- [ ] `W1-03` Chụp baseline `pnpm install`, lint, typecheck, test và build; Owner: Frontend.
- [ ] `W1-04` Ghi lỗi baseline thành danh sách riêng, không trộn với lỗi do migration; Owner: Frontend.
- [x] `W1-05` Kiểm tra dependency/license và loại package chắc chắn không dùng; Owner: AI.

### Ngày 2 — Làm sạch workspace

- [x] `W1-06` Giữ `apps/api`, đổi `apps/platform-admin` thành `apps/admin`; Owner: Frontend.
- [x] `W1-07` Loại tenant/business/category/service/booking/landing domain; Owner: Backend.
- [x] `W1-08` Loại worker/email/Telegram/Stripe/S3 nếu không còn consumer; Owner: Backend.
- [x] `W1-09` Sửa workspace filters, Turbo tasks, package names và import paths; Owner: Frontend.
- [x] `W1-10` Bảo đảm lint/typecheck/build không tham chiếu app đã xóa; Owner: Frontend.

### Ngày 3 — Scaffold dịch vụ và hạ tầng

- [x] `W1-11` Scaffold FastAPI tối thiểu với `/health`; Owner: AI.
- [x] `W1-12` Scaffold Device Simulator tối thiểu với config typed; Owner: Firmware/Frontend.
- [x] `W1-13` Tạo thư mục PlatformIO nhưng chưa gán GPIO; Owner: Firmware/Frontend.
- [x] `W1-14` Cấu hình PostgreSQL + pgvector trong Compose; Owner: Backend.
- [x] `W1-15` Chuẩn hóa `.env.example` và kiểm tra thiếu biến khi startup; Owner: Backend.

### Ngày 4 — Domain và contracts

- [x] `W1-16` Định nghĩa session state, execution status và reason code; Owner: Backend.
- [x] `W1-17` Định nghĩa device heartbeat/create-session/poll/ack schemas; Owner: Backend.
- [x] `W1-18` Định nghĩa internal Vision request/response schemas; Owner: AI.
- [x] `W1-19` Sinh hoặc chia sẻ TypeScript client/types cho Admin và Simulator; Owner: Frontend.
- [x] `W1-20` Viết contract examples hợp lệ và không hợp lệ; Owner: cả nhóm.

### Ngày 5 — Database, CI và onboarding

- [x] `W1-21` Tạo migration cốt lõi, chưa thêm dữ liệu AI giả làm kết quả thật; Owner: Backend.
- [x] `W1-22` Tạo development seed nhỏ, deterministic; Owner: Backend.
- [x] `W1-23` CI chạy format check, lint, typecheck và unit test; Owner: Frontend.
- [x] `W1-24` Viết root README: cài đặt, chạy, reset dev database và xử lý lỗi thường gặp; Owner: AI.
- [ ] `W1-25` Một thành viên mới clone sạch và chạy theo README; Owner: người không viết README.

## 5. Schema dự kiến

Tuần 1 tạo bảng và ràng buộc nền cho:

- Admin Account và auth giữ từ base nhưng được đổi tên/ngữ nghĩa nếu cần;
- Person;
- RFID Credential;
- Face Template metadata;
- Access Point;
- Device;
- Access Grant;
- Auth Session;
- Actuation Command;
- Access Event.

Không tối ưu index vector 1:N trong tuần này. Xác minh MVP là 1:1.

## 6. Port và environment đề xuất

| Service    | Port mặc định |
| ---------- | ------------- |
| API        | 3000          |
| Admin      | 3001          |
| Vision     | 8001          |
| PostgreSQL | 15432         |

Port phải cấu hình được. Không hardcode URL nội bộ trong component hoặc controller.

## 7. Kiểm thử

- API health trả trạng thái database.
- Vision health không cần load model nặng để trả lời liveness.
- Shared schemas reject enum ngoài contract.
- Migration chạy từ database trống.
- Seed chạy lặp có hành vi được xác định.
- Admin protected route chuyển về login khi chưa xác thực.
- CI chạy trên clean checkout.

## 8. Definition of Done

- [x] `pnpm install` hoàn tất trên clean workspace.
- [x] Lint, typecheck, unit test và build đều pass hoặc baseline exception đã được duyệt bằng văn bản.
- [x] `docker compose up` khởi động database.
- [x] API, Admin, Vision health chạy được.
- [x] Không còn import từ domain booking/tenant đã loại bỏ.
- [x] Không có secret thật trong Git.
- [x] Contracts có examples và người phụ trách thay đổi.
- [ ] Root README được một thành viên khác kiểm chứng.

## 9. Rủi ro và dự phòng

- Base repo quá dính domain: giữ cấu hình/tooling, scaffold lại module nghiệp vụ thay vì cố sửa mọi module.
- Auth phụ thuộc tenant: cắt về một loại Admin Account trước khi phát triển tính năng.
- pgvector/Prisma gây khó migration: dùng migration SQL rõ ràng và repository adapter, không để ORM detail lan ra use case.
- Dọn dependency làm vỡ build: xóa theo từng nhóm, mỗi nhóm chạy lại baseline checks.

## 10. Bằng chứng cần lưu

- Cây thư mục sau cleanup.
- Output CI đầu tiên pass.
- Screenshot Admin login.
- JSON API/Vision health.
- ERD bản đầu và migration hash.
