# Tuần 5 — Tích hợp phần cứng

## 1. Mục tiêu

Thay Device Simulator bằng ESP32 thật trên cùng contract, xác nhận nguồn/kết nối an toàn và giữ hành vi fail-safe trong các lỗi thường gặp.

## 2. Điều kiện bắt đầu

- M1–M3 đã đạt; simulator vẫn pass contract tests.
- Đã có linh kiện thực tế và datasheet đúng phiên bản.
- Quyết định board, RFID reader, actuator, nguồn và door sensor được ghi trong decision log.
- Có sơ đồ nối dây được một người khác review trước khi cấp nguồn.

## 3. Kết quả bàn giao

- ESP32 heartbeat và tạo session.
- RFID adapter đọc UID ổn định.
- Device poll/parse/validate command.
- Actuator thực thi một command tối đa một lần theo khả năng lưu trữ thiết bị.
- LED/còi thể hiện ready/allowed/denied/network error.
- Door sensor nếu có tạo trạng thái confirmed; nếu không dùng unconfirmed.
- Mất mạng/API/camera không mở cửa.

## 4. Firmware state machine

```text
BOOT → CONNECTING → READY → REQUESTING → WAITING
  ↑        │          ↑                    ├→ ALLOWING
  └────────┴──────────┴────────────────────┼→ DENYING
                                           └→ ERROR
```

Network/heartbeat được phục vụ không chặn; không dùng delay dài trong main loop.

## 5. Kế hoạch từng ngày

### Ngày 1 — Xác nhận phần cứng và nguồn

- [ ] `W5-01` Ghi part number, voltage, logic level và datasheet; Owner: Firmware.
- [ ] `W5-02` Sơ đồ GPIO/SPI/PWM và common ground; Owner: Firmware; Review: Backend/AI.
- [ ] `W5-03` Lập power budget gồm idle/start/stall current; Owner: Firmware.
- [ ] `W5-04` Đo adapter polarity/voltage trước khi gắn tải; Owner: Firmware.
- [ ] `W5-05` Thử actuator riêng, giới hạn góc để tránh ép cơ khí; Owner: Firmware.

### Ngày 2 — Board support và RFID

- [ ] `W5-06` Board profile tách pin/config khỏi logic; Owner: Firmware.
- [ ] `W5-07` `Mfrc522Reader` hoặc adapter đúng thiết bị đã chọn; Owner: Firmware.
- [ ] `W5-08` UID normalization thống nhất với backend; Owner: Firmware + Backend.
- [ ] `W5-09` Debounce/cooldown tránh tạo nhiều request khi giữ thẻ; Owner: Firmware.
- [ ] `W5-10` Serial diagnostics không in credential/token nhạy cảm; Owner: Firmware.

### Ngày 3 — Network và protocol

- [ ] `W5-11` Wi-Fi reconnect có backoff và timeout; Owner: Firmware.
- [ ] `W5-12` Heartbeat kèm firmware, uptime, reset reason, RSSI và capabilities; Owner: Firmware.
- [ ] `W5-13` Persistent request ID qua retry/reboot theo policy đã chọn; Owner: Firmware.
- [ ] `W5-14` Poll session không chặn và tôn trọng expiry; Owner: Firmware.
- [ ] `W5-15` Xác thực server/device credential và xử lý clock skew; Owner: Firmware + Backend.

### Ngày 4 — Actuator, indicator và ACK

- [ ] `W5-16` Servo/relay adapter; Owner: Firmware.
- [ ] `W5-17` Persist seen command trước actuation; Owner: Firmware.
- [ ] `W5-18` Indicator patterns documented cho ready/success/deny/network error; Owner: Firmware.
- [ ] `W5-19` Door sensor adapter/debounce nếu có; Owner: Firmware.
- [ ] `W5-20` ACK queue/retry idempotent; Owner: Firmware + Backend.

### Ngày 5 — Fault injection và demo

- [ ] `W5-21` Mất Wi-Fi trước/sau create session; Owner: cả nhóm.
- [ ] `W5-22` API/Vision down và response malformed; Owner: cả nhóm.
- [ ] `W5-23` Reboot trước/sau persist command và actuation; Owner: cả nhóm.
- [ ] `W5-24` Theo dõi voltage/reset khi actuator khởi động/chịu tải; Owner: Firmware.
- [ ] `W5-25` So sánh simulator và ESP32 trên cùng contract suite, ghi evidence M4; Owner: cả nhóm.

## 6. Hardware abstraction

```text
RfidReader       → Mfrc522Reader | FakeRfidReader
DoorActuator     → ServoActuator | RelayActuator | FakeActuator
DoorSensor       → ReedSwitchSensor | NoDoorSensor
Indicator        → LedBuzzerIndicator | SerialIndicator
CommandStore     → Preferences/NVS adapter
NetworkClient    → EspHttpClient | FakeNetworkClient
```

App state machine chỉ phụ thuộc interface, không include trực tiếp library phần cứng ngoài adapter.

## 7. An toàn điện/cơ khí

- Không cấp servo từ chân 3.3 V của ESP32.
- Dùng nguồn đủ dòng và common ground khi trao đổi tín hiệu.
- Xác nhận logic level của module thực tế.
- Dùng điện trở cho LED và transistor/driver nếu tải vượt GPIO.
- Tụ lọc không thay thế nguồn thiếu công suất.
- Có phương án mở thủ công khi mất nguồn.
- Dừng thử khi actuator nóng, rung mạnh, kẹt hoặc voltage tụt ngoài giới hạn.

## 8. Kiểm thử bắt buộc

- Giữ thẻ trên reader không tạo nhiều phiên ngoài policy.
- Retry create request trả cùng session.
- Duplicate poll/command không mở lại.
- Command hết hạn, sai Device hoặc sai Session bị bỏ qua.
- ACK mất và retry không tạo event trùng.
- Wi-Fi/API/Vision down giữ cửa đóng.
- Brownout/reboot được ghi nhận.
- Door sensor open/close timeout nếu có.
- Heartbeat dừng thì Admin chuyển offline theo server threshold.

## 9. Definition of Done

- [ ] GPIO/nguồn dựa trên linh kiện thật và có sơ đồ.
- [ ] Firmware không hardcode business policy.
- [ ] ESP32 và simulator cùng pass protocol scenarios.
- [ ] Command replay/expiry có test thực tế.
- [ ] Không có lỗi nguồn/reset trong số lần lặp đã ghi rõ.
- [ ] Execution status phản ánh đúng có/không có sensor.
- [ ] M4 demo và evidence hoàn tất.

## 10. Rủi ro và dự phòng

- Chưa có phần cứng: tiếp tục bằng simulator, không giả vờ hoàn tất M4.
- Servo reset ESP32: nguồn riêng đủ dòng, common ground, đo voltage và sửa cơ khí.
- UID format khác: canonicalize bằng bytes/hex contract, không xử lý tùy tiện ở UI.
- TLS khó trên LAN: vẫn dùng device credential; ghi rõ giới hạn và kế hoạch HTTPS, không gửi secret trong log.
- Không có reed switch: báo `APPLIED_UNCONFIRMED`, không suy diễn cửa đã mở.

## 11. Bằng chứng cần lưu

- Ảnh linh kiện, part number và sơ đồ dây cuối.
- Power budget và kết quả đo voltage/current/reset.
- Firmware version và build flags.
- Video allow/deny/network failure.
- Log cùng correlation ID từ ESP32 đến Access Event.
