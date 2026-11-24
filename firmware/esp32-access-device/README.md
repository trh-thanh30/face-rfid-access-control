# ESP32 access device

Firmware thay `apps/device-simulator` trên cùng Device API contract. NestJS vẫn là nơi duy nhất quyết định allow/deny; firmware chỉ đọc RFID, gửi request, kiểm tra command và điều khiển cửa.

## Test lõi không cần ESP32

```bash
./scripts/test-native.sh
```

## Profile fixture an toàn

1. Copy `include/secrets.example.h` thành `include/secrets.local.h` và điền Wi-Fi, API URL, device code/token.
2. Chạy `pio run` và `pio run -t upload` khi đã cài PlatformIO.
3. Profile mặc định không dùng GPIO: nhập `RFID:04A1B2C3` qua Serial Monitor; actuator chỉ ghi log.

Thiếu secrets khiến firmware dừng fail-closed. File local và `.pio/` đã được Git ignore.

## Phần cứng thật

Không sửa state machine. Tạo environment local kế thừa `esp32dev_safe`, rồi khai báo adapter, pin và dependency theo đúng board/module. MFRC522 dùng `ACCESS_RFID_MFRC522`, `ACCESS_PIN_RFID_SS`, `ACCESS_PIN_RFID_RST`; relay dùng `ACCESS_ACTUATOR_RELAY`, `ACCESS_PIN_ACTUATOR`, `ACCESS_RELAY_ACTIVE_HIGH`; servo dùng `ACCESS_ACTUATOR_SERVO`, hai góc open/closed và dependency ESP32Servo; reed switch dùng `ACCESS_DOOR_SENSOR_REED`, pin và polarity.

Không có GPIO mặc định cố định. Chỉ chốt pin sau khi xác nhận part number, datasheet, nguồn và wiring review.

## Fail-safe

- Command sai session/device, hết hạn, clock chưa sync hoặc đã thấy sẽ không chạy.
- Command ID được reserve trong NVS trước khi actuator chạy.
- ACK được lưu và retry; reboot giữa actuation sinh `UNKNOWN`, không mở lại.
- Mất mạng giữ actuator đóng.
- Không có door sensor thì ACK là `APPLIED_UNCONFIRMED`.

Xem checklist và các ô evidence chưa hoàn tất tại `docs/hardware/`.
