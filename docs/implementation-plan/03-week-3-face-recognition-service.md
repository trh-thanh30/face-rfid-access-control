# Tuần 3 — Dịch vụ nhận dạng khuôn mặt

## 1. Mục tiêu

Thay Fake Vision bằng pipeline khuôn mặt thật nhưng vẫn giữ nguyên `FaceVerifierPort`. Hoàn thành enrollment nhiều mẫu và xác minh 1:1 bằng webcam hoặc fixture.

## 2. Điều kiện bắt đầu

- M1 software-only demo đã pass.
- Internal Vision contract đã ổn định.
- Có bộ ảnh/video fixture được phép sử dụng và không commit dữ liệu nhạy cảm trái phép.
- Đã chọn runtime Python và cách quản lý dependency có lock file.

## 3. Kết quả bàn giao

- Vision Service khởi động độc lập và báo health/readiness riêng.
- Model được tải có version, checksum và pipeline fingerprint.
- Enrollment thu 5–10 mẫu hợp lệ.
- Verification chỉ so sánh với Face Template của Person từ session.
- Webcam và fixture dùng chung một `CameraProvider` contract.
- Backend xử lý được no-face, multi-face, low-quality, busy và timeout.

## 4. Ranh giới trách nhiệm

Vision thực hiện:

- capture hoặc nhận frame;
- phát hiện, căn chỉnh và đánh giá chất lượng;
- sinh embedding đã chuẩn hóa;
- tính score 1:1 và trả evidence kỹ thuật.

NestJS thực hiện:

- chọn Person từ RFID/session;
- cung cấp/tra cứu templates được phép;
- áp dụng cấu hình threshold đang active;
- kiểm tra lại grant và session expiry;
- ra quyết định và ghi audit.

## 5. Kế hoạch từng ngày

### Ngày 1 — Project và model lifecycle

- [ ] `W3-01` Cấu trúc FastAPI theo router/application/domain/adapters; Owner: AI.
- [ ] `W3-02` Dependency lock và lệnh setup CPU-first; Owner: AI.
- [ ] `W3-03` Model loader lazy, readiness fail rõ khi thiếu model; Owner: AI.
- [ ] `W3-04` Script tải model có checksum; không commit weight lớn; Owner: AI.
- [ ] `W3-05` Ghi pipeline fingerprint: detector, checkpoint, dimension, alignment, input size và library versions; Owner: AI.

### Ngày 2 — Camera và quality pipeline

- [ ] `W3-06` `OpenCVCameraProvider`; Owner: AI.
- [ ] `W3-07` `FixtureCameraProvider` phát frame có timestamp; Owner: AI.
- [ ] `W3-08` Kiểm tra zero/one/multiple faces; Owner: AI.
- [ ] `W3-09` Blur, brightness, face size và pose checks; Owner: AI.
- [ ] `W3-10` Camera lock theo deadline và trả `CAMERA_BUSY`; Owner: AI.

### Ngày 3 — Enrollment

- [ ] `W3-11` Enrollment session có progress, timeout và cancel; Owner: AI + Backend.
- [ ] `W3-12` Thu 5–10 mẫu đạt chất lượng, tránh lưu frame gần như trùng nhau; Owner: AI.
- [ ] `W3-13` Chuẩn hóa L2 và validate dimension/finite values; Owner: AI.
- [ ] `W3-14` Lưu Face Template cùng metadata, không log vector; Owner: Backend.
- [ ] `W3-15` Re-enroll tạo version/template mới và có quy tắc deactivate mẫu cũ; Owner: Backend.

### Ngày 4 — Verification 1:1

- [ ] `W3-16` Chỉ nhận reference templates từ Person đã được session xác định; Owner: AI.
- [ ] `W3-17` Reject templates khác pipeline/dimension; Owner: AI.
- [ ] `W3-18` Mỗi frame lấy max score trên references, phiên lấy median qua frames; Owner: AI.
- [ ] `W3-19` Trả score, validFrameCount, quality summary, latency và model version; Owner: AI.
- [ ] `W3-20` Backend adapter map lỗi Vision sang shared reason codes; Owner: Backend.

### Ngày 5 — Contract/integration tests và demo

- [ ] `W3-21` Golden fixture test cho pipeline ổn định trong sai số cho phép; Owner: AI.
- [ ] `W3-22` Contract test giữa NestJS và FastAPI; Owner: AI + Backend.
- [ ] `W3-23` Test camera busy, timeout, crash và malformed response; Owner: cả nhóm.
- [ ] `W3-24` End-to-end simulator + Vision thật; Owner: cả nhóm.
- [ ] `W3-25` Ghi cấu hình demo và evidence M2; Owner: AI.

## 6. Internal API dự kiến

```http
GET  /health
GET  /ready
POST /internal/v1/enrollments
POST /internal/v1/verifications
```

Internal endpoint không được public trực tiếp ra mạng ngoài. Request verification chứa session/correlation ID và references hoặc một cơ chế lookup nội bộ được chấp thuận; không nhận Person tùy ý từ ESP32.

Response verification tối thiểu:

```json
{
  "matched": false,
  "similarity": 0.0,
  "validFrameCount": 0,
  "modelVersion": "...",
  "pipelineFingerprint": "...",
  "quality": {},
  "latencyMs": 0,
  "reasonCode": "LOW_QUALITY"
}
```

`matched` là kết quả kỹ thuật theo cấu hình được truyền/chọn có phiên bản; quyền mở cửa vẫn do NestJS quyết định.

## 7. Dữ liệu và bảo mật

- Fixture test không chứa danh tính thật nếu chưa có đồng thuận.
- Ảnh gốc mặc định không lưu sau khi tạo embedding.
- Nếu cần lưu để nghiên cứu, phải có mục đích, consent, retention và quyền truy cập rõ ràng.
- Không ghi full embedding, frame hoặc model secret vào application log.
- Endpoint nội bộ dùng service credential và giới hạn network.
- Backup Face Template được bảo vệ tương đương dữ liệu sinh trắc học.

## 8. Calibration ban đầu

Tuần 3 chỉ tạo công cụ và định dạng dữ liệu calibration, chưa tuyên bố chỉ số cuối:

- enrollment, calibration và test captures phải độc lập;
- lưu raw scores và labels;
- threshold không được chọn trên test set;
- cấu hình gồm camera, detector, model, `K_min`, timeout và quality rules;
- mọi thay đổi pipeline tạo một evaluation version mới.

## 9. Kiểm thử bắt buộc

- Zero, one và multiple faces.
- Frame tối, sáng gắt, mờ và mặt quá nhỏ.
- Reference rỗng, dimension sai và model version khác.
- Camera đang bị khóa bởi phiên khác.
- Session hết hạn trong khi capture.
- Vision restart hoặc timeout.
- Positive fixture và negative fixture.
- Không reuse frame chụp trước session.

## 10. Definition of Done

- [ ] Fake và real adapter có cùng contract tests.
- [ ] Webcam và fixture camera thay nhau bằng config.
- [ ] Enrollment tạo nhiều templates có metadata đầy đủ.
- [ ] Verification là 1:1, không có tìm kiếm toàn database.
- [ ] Model/pipeline version xuất hiện trong evidence và Access Event metadata.
- [ ] Lỗi Vision không làm cửa mở.
- [ ] M2 chạy end-to-end và lưu bằng chứng.

## 11. Rủi ro và dự phòng

- Máy yếu: dùng CPU runtime và model phù hợp; đo trước khi tối ưu GPU.
- Docker không truy cập webcam: chạy Vision native trong dev; Docker chỉ dùng cho CI fixture hoặc map `/dev/video*` khi đã kiểm chứng.
- Model tự tải lúc startup gây lỗi: tách bước setup/download và kiểm checksum.
- Score tốt giả do data leakage: bắt buộc capture độc lập giữa enrollment/calibration/test.
- Ảnh in/video spoof: ghi rõ giới hạn; không quảng cáo liveness nếu chưa triển khai và đo.

## 12. Bằng chứng cần lưu

- Pipeline fingerprint và model checksum.
- Enrollment quality report.
- Positive/negative raw scores từ fixture.
- Latency breakdown detect/align/embed/compare.
- Video demo simulator + webcam.
