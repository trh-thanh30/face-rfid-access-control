# Device protocol scenarios dùng chung

Simulator và ESP32 firmware phải giữ cùng các invariant sau. Host tests firmware nằm tại `firmware/esp32-access-device/test/native/`; integration tests simulator/API là oracle cho HTTP contract.

| Scenario                                                     | Kết quả bắt buộc                                      |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| Allowed, command đúng device/session và còn hạn              | Reserve trước actuation; chạy tối đa một lần; gửi ACK |
| Sensor quan sát cửa mở                                       | `CONFIRMED`                                           |
| Không có sensor/không quan sát được                          | `APPLIED_UNCONFIRMED`                                 |
| Denied/expired/malformed/wrong device/session/clock unsynced | Không chạy, cửa giữ đóng                              |
| Command ID đã reserve                                        | Không chạy lại                                        |
| Mất Wi-Fi/API/Vision                                         | Không tự allow; giữ đóng; retry có backoff            |
| Mất mạng khi ACK                                             | Lưu ACK và retry, không actuation lại                 |
| Reboot giữa actuation                                        | ACK `UNKNOWN`; không mở lại                           |

M4 chỉ hoàn tất sau khi ESP32 thật chạy lại scenario phù hợp và có power/wiring evidence.
