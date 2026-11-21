# WP-06 — Face Enrollment and 1:1 Verification

| Thuộc tính | Giá trị                                                      |
| ---------- | ------------------------------------------------------------ |
| Trạng thái | Partial scaffold                                             |
| Tuần       | 3                                                            |
| Ưu tiên    | Critical                                                     |
| Bề mặt     | FastAPI Vision, camera, model, Face Template, NestJS adapter |

## Outcome

Đăng ký nhiều mẫu khuôn mặt đạt chất lượng và xác minh 1:1 đúng Person do RFID/session xác định. Vision trả evidence; NestJS quyết định quyền.

## Scope

- `CameraProvider`: webcam, fixture và uploaded frames.
- InsightFace/OpenCV engine có model checksum/fingerprint.
- Quality checks: face count, blur, brightness, pose và face size.
- Enrollment 5–10 mẫu có metadata.
- Verification: max trên references cho từng frame, median qua frames.
- Camera lock, deadline, cancellation và error taxonomy.
- Calibration data export; chưa tuyên bố accuracy trước Week 6.

Không bao gồm nhận dạng 1:N hoặc tuyên bố liveness.

## Target interfaces

```http
GET  /health
GET  /ready
POST /internal/v1/enrollments
POST /internal/v1/verifications
```

## Rules

- Frame phải được chụp trong thời hạn session.
- Không so sánh templates khác dimension/model/pipeline.
- Reference rỗng bị reject trước capture.
- Một camera phục vụ một session; phiên cạnh tranh nhận `CAMERA_BUSY`.
- Ảnh gốc mặc định không lưu; embedding không vào log/UI.
- Threshold và `K_min` là config versioned, chọn từ calibration set.

## Tasks

| ID       | Task                                      | Trạng thái |
| -------- | ----------------------------------------- | ---------- |
| WP06-001 | FastAPI health/settings/tests             | Done       |
| WP06-002 | CameraProvider adapters                   | Todo       |
| WP06-003 | Model loader/checksum/fingerprint         | Todo       |
| WP06-004 | Quality evaluator                         | Todo       |
| WP06-005 | Enrollment session/persistence            | Todo       |
| WP06-006 | 1:1 verification algorithm                | Todo       |
| WP06-007 | NestJS Vision adapter/contract tests      | Todo       |
| WP06-008 | Fixture/golden tests và latency breakdown | Todo       |

## Acceptance

- Fixture và webcam thay nhau bằng config, không đổi use case.
- Enrollment tạo nhiều active templates có metadata.
- Positive/negative/no-face/multi-face/low-quality/busy/timeout có test.
- Lỗi Vision không tạo command mở cửa.
- Model/pipeline fingerprint đi cùng evidence.
