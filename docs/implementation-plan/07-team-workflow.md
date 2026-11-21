# Quy trình làm việc nhóm

## 1. Vai trò đề xuất

| Vai trò | Trách nhiệm chính | Trách nhiệm dự phòng |
| --- | --- | --- |
| Backend owner | NestJS, Prisma, session, access policy, audit | Review firmware protocol |
| AI owner | Vision, model, quality, calibration, evaluation | Review privacy và test data |
| Client/device owner | Admin, simulator, firmware | Review shared contracts và demo |

Owner không có nghĩa là người duy nhất được sửa. Mỗi vùng phải có ít nhất một reviewer hiểu được cách chạy và kiểm tra.

## 2. Nhịp làm việc tuần

- Đầu tuần: xác nhận đầu vào, chia task và chọn demo scenario.
- Mỗi ngày: cập nhật task/blocker ngắn; ưu tiên evidence thay cho “gần xong”.
- Giữa tuần: tích hợp vertical slice sớm, không chờ cuối tuần mới ghép.
- Cuối tuần: chạy Definition of Done từ môi trường sạch, demo và cập nhật decision log.
- Không chuyển tuần nếu mốc chính chưa đạt mà không ghi rõ carry-over và ảnh hưởng.

## 3. Branch và commit

Branch đề xuất:

```text
feat/w2-device-session
fix/w3-camera-lock-timeout
docs/w6-evaluation-protocol
```

Commit dùng Conventional Commits:

```text
feat(api): create idempotent access session
test(vision): cover multiple-face rejection
fix(firmware): ignore expired command
docs(plan): record selected RFID module
```

Mỗi commit nên nhỏ, build/test được và không trộn formatting toàn repo với thay đổi nghiệp vụ.

## 4. Pull request checklist

- [ ] Mô tả vấn đề và hành vi sau thay đổi.
- [ ] Có link task tuần và decision liên quan.
- [ ] Nêu migration, environment hoặc contract change.
- [ ] Test mới chứng minh happy path và failure path.
- [ ] Không chứa secret, embedding, ảnh thật hoặc UID không được phép.
- [ ] Lint, typecheck và test liên quan pass.
- [ ] Có hướng dẫn kiểm tra thủ công nếu UI/hardware.
- [ ] Screenshot/video/log cho thay đổi có giao diện hoặc thiết bị.
- [ ] Rollback/migration safety được xem xét.

## 5. Quy trình thay đổi contract

1. Mở thay đổi ở package contracts/OpenAPI trước.
2. Ghi backward compatibility hoặc migration plan.
3. Cập nhật contract tests.
4. Cập nhật API provider.
5. Cập nhật Simulator và Admin consumer.
6. Cập nhật firmware nếu contract device thay đổi.
7. Cập nhật Vision nếu internal contract thay đổi.
8. Chỉ merge khi matrix consumer/provider pass hoặc rollout order được ghi rõ.

Enum/reason code không được copy tay thành nhiều nguồn sự thật. Firmware có thể dùng generated header hoặc bảng mapping được kiểm tra từ contract version.

## 6. Quy trình database migration

- Không sửa migration đã dùng chung; tạo migration mới.
- Migration và application change phải tương thích với thứ tự deploy đã ghi.
- Không dùng cascade delete cho audit/event data.
- Seed chỉ chứa dữ liệu giả, deterministic và không có secret.
- Mọi migration chạy thử từ database trống và từ schema version trước.
- Schema reset chỉ dùng môi trường dev/test, không đưa thành hướng dẫn production.

## 7. Quy trình báo blocker

Blocker entry gồm:

```text
Task:
Blocked by:
Evidence:
What was tried:
Decision/input needed:
Owner:
Impact date/milestone:
Fallback work available:
```

Thiếu phần cứng không phải blocker cho tuần 1–4. Chuyển sang simulator/fixture và ghi phần xác nhận thật còn thiếu.

## 8. Definition of ready cho task

Task chỉ bắt đầu khi có:

- mục tiêu hành vi rõ;
- input/output hoặc UI state mong đợi;
- dependency đã có hoặc có fake adapter;
- cách kiểm tra;
- owner và reviewer;
- không còn quyết định phạm vi lớn bị giấu trong task.

## 9. Definition of done cho task

- Code/tài liệu đúng scope.
- Test hoặc evidence chứng minh hành vi.
- Error path quan trọng đã xử lý.
- Contract/docs cập nhật nếu cần.
- Không để TODO vô chủ.
- Reviewer chạy hoặc hiểu rõ cách tái hiện.
- Task checkbox và milestone status được cập nhật.

## 10. Quy tắc demo

- Demo bắt đầu từ config/seed được ghi rõ.
- Không sửa database thủ công giữa demo để làm luồng chạy.
- Có ít nhất một allow và một deny case.
- Có thể truy từ UI/log bằng correlation ID.
- Nếu dùng fake/simulator, nói rõ thành phần nào là fake.
- Failure trong demo được lưu làm issue/evidence, không che bằng chạy lại không ghi nhận.
