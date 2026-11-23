# WP-06 — Face Enrollment and 1:1 Verification

| Thuộc tính | Giá trị                                                      |
| ---------- | ------------------------------------------------------------ |
| Trạng thái | Implemented; chờ kiểm chứng webcam/model và E2E runtime      |
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
| WP06-002 | CameraProvider adapters                   | Done       |
| WP06-003 | Model loader/checksum/fingerprint         | Done       |
| WP06-004 | Quality evaluator                         | Done       |
| WP06-005 | Enrollment session/persistence            | Done       |
| WP06-006 | 1:1 verification algorithm                | Done       |
| WP06-007 | NestJS Vision adapter/contract tests      | Done       |
| WP06-008 | Fixture/golden tests và latency breakdown | Done       |

## Implementation evidence

- `apps/vision/app/domain` giữ port, quality policy và vector math độc lập phần cứng.
- `FixtureCameraProvider`, `UploadedFrameProvider` và `OpenCVCameraProvider` thay qua config; InsightFace được nạp lazy và kiểm checksum.
- Enrollment loại frame zero/multi-face, quality thấp và mẫu gần trùng; NestJS thay atomically các template active sau khi Vision thành công.
- Verification chỉ nhận references của Person do RFID/session chọn, lấy max theo reference trên từng frame rồi median qua các frame.
- Internal API dùng service bearer; ảnh gốc không được lưu và embedding không được log/UI.
- Fixture unit tests và NestJS adapter tests đã pass. Kiểm chứng webcam/model thật và E2E database còn phụ thuộc phần cứng + Docker runtime.

## Acceptance

- Fixture và webcam thay nhau bằng config, không đổi use case.
- Enrollment tạo nhiều active templates có metadata.
- Positive/negative/no-face/multi-face/low-quality/busy/timeout có test.
- Lỗi Vision không tạo command mở cửa.
- Model/pipeline fingerprint đi cùng evidence.
