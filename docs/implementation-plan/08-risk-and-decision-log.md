# Rủi ro và nhật ký quyết định

## 1. Cách sử dụng

Mỗi quyết định chuyển qua `Proposed → Accepted → Superseded`. Không đánh dấu `Accepted` nếu chưa có evidence phù hợp. Khi thay đổi, giữ bản ghi cũ và liên kết quyết định thay thế.

Mẫu quyết định:

```text
ID:
Status:
Date:
Owner:
Context:
Options:
Decision:
Evidence:
Consequences:
Revisit trigger:
```

## 2. Decision register

| ID | Quyết định | Trạng thái ban đầu | Hạn chốt | Owner | Ảnh hưởng |
| --- | --- | --- | --- | --- | --- |
| D-001 | Selective fork `booking-system-base` | Accepted | Trước W1 | Backend | Toàn repo |
| D-002 | Một Admin app, bỏ landing/multi-tenant | Accepted | Trước W1 | Frontend | Workspace/UI |
| D-003 | HTTP polling cho Device | Accepted | Trước W2 | Backend | API/Firmware |
| D-004 | Xác minh khuôn mặt 1:1 | Accepted | Trước W3 | AI | Vision/Data |
| D-005 | Board ESP32 cụ thể | Proposed | Trước W5 | Firmware | GPIO/build |
| D-006 | RFID reader cụ thể | Proposed | Trước W5 | Firmware | Driver/logic level |
| D-007 | Servo, relay hay khóa điện | Proposed | Trước W5 | Firmware | Nguồn/cơ khí |
| D-008 | Có reed switch hay không | Proposed | Trước W5 | Firmware | Execution status |
| D-009 | Webcam/model cụ thể | Proposed | Trước W3/W6 | AI | Pipeline/evaluation |
| D-010 | Chính sách lưu ảnh gốc | Proposed | Trước W3 | Cả nhóm | Privacy/storage |
| D-011 | Threshold và `K_min` | Proposed | W6 calibration | AI | FAR/FRR |
| D-012 | Timeout/poll/retry values | Proposed | Trước W6 | Backend/Firmware | Latency/reliability |
| D-013 | Device authentication trong LAN | Proposed | Trước W2 | Backend | Security |

## 3. Risk register

Thang xác suất/ảnh hưởng: Low, Medium, High.

| ID | Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu | Trigger/Fallback | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Chưa có phần cứng đúng hạn | High | Medium | Simulator là first-class client | Hoàn tất M1–M3, dời riêng M4 | Firmware |
| R-002 | Base repo mang quá nhiều domain | Medium | High | Selective fork, contract-first | Scaffold lại module thay vì sửa domain cũ | Backend |
| R-003 | Servo làm sụt áp/reset ESP32 | Medium | High | Power budget, nguồn phù hợp, common ground | Tách nguồn tải, sửa cơ khí | Firmware |
| R-004 | Docker không truy cập webcam | High | Medium | Camera adapter | Chạy Vision native khi dev | AI |
| R-005 | Face data leakage | Medium | High | Access control, no logging, retention | Dùng fixture ẩn danh, dừng thu dữ liệu | AI |
| R-006 | Threshold chọn trên test set | Medium | High | Split độc lập và khóa protocol | Tạo evaluation version/test set mới | AI |
| R-007 | Retry mở cửa nhiều lần | Medium | High | Unique request, stable command, persisted seen IDs | Fail closed và audit replay | Backend/Firmware |
| R-008 | Camera dùng nhầm frame của phiên khác | Medium | High | Camera lock, timestamps, session deadline | `CAMERA_BUSY`, discard frame | AI |
| R-009 | Timezone/quyền qua nửa đêm sai | Medium | Medium | Domain rule và boundary tests | Từ chối an toàn, sửa grant policy | Backend |
| R-010 | Demo phụ thuộc mock data ẩn | Medium | Medium | Clean seed và scripted scenarios | Demo lại từ clean database | Cả nhóm |
| R-011 | Ảnh/video spoof | High | High | Nêu giới hạn, giám sát, 2 yếu tố | Không tuyên bố liveness; future challenge | Cả nhóm |
| R-012 | Mạng/API/Vision lỗi làm mở cửa | Low | High | Fail-safe state machine | Cửa đóng, signal error | Backend/Firmware |
| R-013 | Scope creep | High | Medium | MVP/out-of-scope rõ | Đưa yêu cầu mới vào backlog sau M5 | Cả nhóm |

## 4. Hardware decision checklist

Trước khi accept D-005 đến D-009, ghi:

- part number và ảnh linh kiện;
- datasheet/source;
- voltage và logic level;
- idle/start/stall current nếu liên quan;
- connector/pinout;
- driver/library version;
- test tối thiểu đã chạy;
- ảnh hưởng tới board profile, nguồn và cơ khí.

## 5. Recognition configuration checklist

Trước khi accept D-009/D-011/D-012, ghi:

- camera model/resolution/FPS;
- detector/checkpoint/hash;
- embedding model/checkpoint/hash/dimension;
- alignment/input size/library versions;
- quality thresholds;
- number of enrollment references;
- `K_min`, similarity threshold và capture timeout;
- calibration data version và selection criterion.

## 6. Open questions

- Admin enrollment dùng camera cố định qua Vision hay browser upload là luồng chính?
- Device credential dùng static token, HMAC hay certificate trong phạm vi đồ án?
- UID được gửi raw qua kênh bảo vệ hay pseudonymize tại Device?
- Embedding lưu bằng pgvector trực tiếp hay qua custom repository serialization?
- Có cần giữ ảnh enrollment tạm thời để audit chất lượng không?
- Quyền qua nửa đêm thuộc ngày bắt đầu hay tách hai grant?
- Session concurrency policy khi nhiều thẻ quét liên tiếp tại một camera?
- Mốc offline là bao nhiêu heartbeat và có cần hysteresis khi online lại?

Mỗi câu hỏi phải được gắn decision ID trước khi ảnh hưởng code production.
