# WP08 — Hardware selection, wiring và power evidence

Đây là form evidence, không phải sơ đồ dây đã được phê duyệt. Nhóm chưa chốt phần cứng nên không được suy diễn GPIO, điện áp hoặc dòng cấp.

## Bill of materials

| Thành phần             | Part number/revision | Datasheet | Logic voltage | Supply voltage | Trạng thái |
| ---------------------- | -------------------- | --------- | ------------- | -------------- | ---------- |
| ESP32 board            | TBD                  | TBD       | TBD           | TBD            | Chưa chốt  |
| RFID reader            | TBD                  | TBD       | TBD           | TBD            | Chưa chốt  |
| Actuator/lock + driver | TBD                  | TBD       | TBD           | TBD            | Chưa chốt  |
| Door sensor            | Optional/TBD         | TBD       | TBD           | TBD            | Chưa chốt  |
| Power supply           | TBD                  | TBD       | N/A           | TBD            | Chưa chốt  |

## Wiring review

| Signal                    | ESP32 GPIO | Module pin | Level shifting/driver    | Reviewer |
| ------------------------- | ---------- | ---------- | ------------------------ | -------- |
| SPI SCK/MISO/MOSI/SS      | TBD        | TBD        | TBD                      | TBD      |
| RFID RST                  | TBD        | TBD        | TBD                      | TBD      |
| Actuator control          | TBD        | TBD        | Bắt buộc xác nhận driver | TBD      |
| Door sensor/common ground | TBD        | TBD        | TBD                      | TBD      |

## Power budget và số đo

| Tải                  | Idle (mA) | Typical (mA) | Start/stall peak (mA) | Min voltage | Evidence |
| -------------------- | --------- | ------------ | --------------------- | ----------- | -------- |
| ESP32 + Wi-Fi        | TBD       | TBD          | TBD                   | TBD         | TBD      |
| RFID reader          | TBD       | TBD          | TBD                   | TBD         | TBD      |
| Actuator             | TBD       | TBD          | TBD                   | TBD         | TBD      |
| Tổng + safety margin | TBD       | TBD          | TBD                   | TBD         | TBD      |

Ghi số lần lặp, peak current, brownout/reset count và nhiệt bất thường. Không cấp servo/lock từ chân 3.3 V; dùng nguồn/driver đúng tải, common ground và phương án mở thủ công khi mất nguồn.

## Gate trước demo

- [ ] Part number/datasheet đúng revision và GPIO không xung đột boot/flash.
- [ ] Polarity, trạng thái boot/reset/mất nguồn được đo và review trước cấp nguồn tải.
- [ ] Power budget có số đo start/stall.
- [ ] Ảnh wiring cuối, build flags và fault-test logs được lưu.
