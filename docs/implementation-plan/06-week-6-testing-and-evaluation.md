# Tuần 6 — Thử nghiệm và đánh giá

## 1. Mục tiêu

Khóa cấu hình, chạy thử nghiệm có thể tái lập và tạo bộ số liệu phục vụ đánh giá kỹ thuật cũng như Chương 4 của báo cáo.

## 2. Điều kiện bắt đầu

- M4 hardware demo ổn định hoặc đã ghi rõ phần nào vẫn dùng simulator.
- Pipeline/model/camera/quality rules đã version hóa.
- Có consent và quy tắc bảo vệ dữ liệu người tham gia.
- Kịch bản test, số người và số lượt được duyệt trước khi đo.

## 3. Kết quả bàn giao

- Test protocol có cấu hình khóa.
- Raw observations không bị sửa tay.
- Bảng FAR, FRR, accuracy và confusion counts.
- Median/P95/max latency và breakdown theo thành phần.
- Fault tests và idempotency evidence.
- Limitations và threats to validity được ghi rõ.

## 4. Kế hoạch từng ngày

### Ngày 1 — Khóa protocol và dataset split

- [ ] `W6-01` Chốt N, số genuine/impostor attempts và điều kiện; Owner: AI.
- [ ] `W6-02` Tách enrollment/calibration/test theo lần thu độc lập; Owner: AI.
- [ ] `W6-03` Khóa camera, khoảng cách, ánh sáng, detector, model, alignment và dimension; Owner: AI.
- [ ] `W6-04` Khóa `K_min`, threshold, timeout, poll interval và command duration cho evaluation version; Owner: cả nhóm.
- [ ] `W6-05` Chuẩn bị data dictionary và anonymized participant IDs; Owner: AI.

### Ngày 2 — Calibration

- [ ] `W6-06` Thu calibration genuine/impostor scores; Owner: AI.
- [ ] `W6-07` Vẽ/phân tích score distributions và chọn threshold theo tiêu chí đã công bố; Owner: AI.
- [ ] `W6-08` Không xem test labels để điều chỉnh threshold; Owner: người review.
- [ ] `W6-09` Lưu config version/hash; Owner: AI.
- [ ] `W6-10` Dry-run export script và formulas; Owner: Backend/AI.

### Ngày 3 — Final biometric/system run

- [ ] `W6-11` Chạy genuine attempts trên test set; Owner: cả nhóm.
- [ ] `W6-12` Chạy impostor attempts trên test set; Owner: cả nhóm.
- [ ] `W6-13` Ghi no-face/multiple-face/low-quality riêng khỏi mismatch; Owner: AI.
- [ ] `W6-14` Thu latency timestamps tự động; Owner: Backend.
- [ ] `W6-15` Không chạy lại có chọn lọc để làm đẹp kết quả; mọi exclusion phải có rule trước; Owner: cả nhóm.

### Ngày 4 — Functional/fault tests

- [ ] `W6-16` Chạy TC-01 đến TC-09; Owner: cả nhóm.
- [ ] `W6-17` Duplicate request/poll/ACK và replay command; Owner: Backend/Firmware.
- [ ] `W6-18` API/Vision/camera/network failure; Owner: cả nhóm.
- [ ] `W6-19` Offline detection và recovery; Owner: Backend/Firmware.
- [ ] `W6-20` Actuator/door sensor scenarios và power stability; Owner: Firmware.

### Ngày 5 — Phân tích và đóng gói

- [ ] `W6-21` Tính confusion counts, FAR, FRR, accuracy với mẫu số; Owner: AI.
- [ ] `W6-22` Tính median/P95/max latency, không chỉ average; Owner: Backend.
- [ ] `W6-23` Viết limitations và threats to validity; Owner: cả nhóm.
- [ ] `W6-24` Tạo bảng/hình dùng cho báo cáo từ script, không nhập số thủ công; Owner: AI.
- [ ] `W6-25` Archive config, raw data, processed output, code revision và evidence M5; Owner: cả nhóm.

## 5. Ma trận chức năng tối thiểu

| Mã    | Kịch bản                      | Kỳ vọng                                       |
| ----- | ----------------------------- | --------------------------------------------- |
| TC-01 | Thẻ đúng, mặt đúng, còn quyền | ALLOWED, command hợp lệ, event đầy đủ         |
| TC-02 | Thẻ chưa đăng ký              | Từ chối trước Vision                          |
| TC-03 | Thẻ đúng, mặt người khác      | `FACE_MISMATCH`                               |
| TC-04 | Person bị khóa                | Từ chối trước Vision                          |
| TC-05 | Ngoài khung giờ               | `NO_PERMISSION`/reason cụ thể đã chốt         |
| TC-06 | API mất kết nối               | Cửa đóng, Device báo network error            |
| TC-07 | Camera/Vision không sẵn sàng  | Không mở, lưu infrastructure reason           |
| TC-08 | Retry cùng request ID         | Một logical session/decision/command          |
| TC-09 | Actuator/door feedback lỗi    | Decision giữ nguyên, actuation failed/unknown |

## 6. Công thức và báo cáo

- `FAR = false accepts / impostor attempts × 100%`
- `FRR = false rejects / genuine attempts × 100%`
- `Accuracy = correct decisions / evaluated attempts × 100%`

Luôn báo cả tử số/mẫu số. Phân biệt:

- biometric decision metrics;
- capture/quality failure rate;
- end-to-end system success rate;
- infrastructure failure rate.

Không gộp `NO_FACE`, `LOW_QUALITY` và `FACE_MISMATCH` nếu mục tiêu là phân tích nguyên nhân.

## 7. Latency timestamps

Tối thiểu ghi:

- RFID read;
- create-session received;
- pre-check complete;
- Vision capture start/end;
- decision persisted;
- command received;
- actuator applied;
- ACK persisted.

Clock giữa ESP32 và server có thể lệch; dùng server spans cho tổng quyết định và ghi phương pháp đồng bộ khi so với device timestamps.

## 8. Quản lý dữ liệu thử nghiệm

```text
evaluation/<version>/
├── protocol.md
├── config.json
├── participants.csv
├── attempts.csv
├── raw-scores.csv
├── latency.csv
├── exclusions.csv
├── results/
└── README.md
```

Không commit ảnh hoặc dữ liệu nhận dạng thật nếu repository/access policy chưa phù hợp. Có thể lưu ở vị trí bảo vệ và chỉ commit manifest/checksum.

## 9. Definition of Done

- [ ] Evaluation config được khóa trước final run.
- [ ] Enrollment/calibration/test không rò dữ liệu.
- [ ] Kết quả được sinh từ script tái lập.
- [ ] FAR/FRR có counts và denominators.
- [ ] Latency có median/P95/max và điều kiện đo.
- [ ] TC-01–TC-09 có evidence/pass/fail/issue link.
- [ ] Limitations không bị che giấu.
- [ ] M5 package liên kết đúng code revision và firmware version.

## 10. Rủi ro và dự phòng

- Mẫu quá ít: báo confidence/giới hạn, không khẳng định tổng quát quá phạm vi.
- Tuning trên test set: reset evaluation version và thu final set độc lập.
- Thiết bị thay giữa chừng: tạo config/evaluation version mới, không trộn kết quả.
- Clock lệch: ưu tiên monotonic timestamps trong từng process và correlation spans.
- Loại bỏ kết quả tùy ý: exclusion rule phải viết trước và lưu từng dòng bị loại cùng lý do.

## 11. Bằng chứng cần lưu

- Protocol và config hash.
- Raw score/latency files.
- Script và output tables/charts.
- Test run logs và video lỗi quan trọng.
- Code commit, migration, model checksum và firmware version.

## 12. Trạng thái WP11 hiện tại

Đã có package [`evaluation/wp11-dry-run-v1`](../../evaluation/wp11-dry-run-v1/README.md) để kiểm tra toàn bộ schema và luồng sinh kết quả:

- data dictionary, anonymized synthetic IDs và ba capture ID độc lập;
- chọn threshold chỉ từ calibration và khóa trước khi tính test metrics;
- confusion counts, FAR/FRR/accuracy, capture/infrastructure failures;
- median/P95/max cho từng latency span;
- bảng threshold sweep, biểu đồ score, manifest hash và code revision;
- TC-01–TC-08 có software evidence; TC-09 còn thiếu hardware evidence;
- limitations và threats to validity được lưu cùng package.

Đây chỉ là **synthetic dry-run**, không hoàn thành W6-01..W6-04, W6-06..W6-09, W6-11..W6-20 hoặc M5 final. Trước final run, nhóm vẫn phải chốt protocol/consent, camera/model/hardware thật, thu dữ liệu độc lập và tạo evaluation version `LOCKED` mới.
