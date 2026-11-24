# WP-08 — ESP32 Firmware and Hardware

| Thuộc tính | Giá trị                                                       |
| ---------- | ------------------------------------------------------------- |
| Trạng thái | Partial — firmware core done, hardware evidence pending       |
| Tuần       | 5                                                             |
| Ưu tiên    | Critical                                                      |
| Bề mặt     | PlatformIO firmware, ESP32, RFID, actuator, indicators, power |

## Outcome

ESP32 thay Device Simulator trên cùng contract, vận hành fail-safe và không gắn business policy vào firmware.

## Vị trí source

Firmware nằm tại `firmware/esp32-access-device/`, không nằm trong `apps/`, vì được build/flash bằng PlatformIO cho vi điều khiển chứ không chạy bằng Node/pnpm trên laptop.

## Ports/adapters

```text
RfidReader    → Mfrc522Reader | SerialRfidReader
DoorActuator  → ServoActuator | RelayActuator | TimedFakeActuator
DoorSensor    → ReedSwitchSensor | NoDoorSensor
Indicator     → GpioIndicator | SerialIndicator
CommandStore  → ESP32 NVS
NetworkClient → ESP HTTP adapter
```

## Scope

- Board profile và GPIO sau khi xác nhận linh kiện.
- Non-blocking state machine.
- Wi-Fi reconnect/backoff, heartbeat và session polling.
- Persistent request/command IDs.
- RFID debounce/cooldown.
- Actuator, LED/buzzer và optional door sensor.
- ACK queue/retry và reset recovery.
- Power budget, common ground và manual release.

## Tasks

| ID       | Task                                      | Trạng thái                          |
| -------- | ----------------------------------------- | ----------------------------------- |
| WP08-001 | PlatformIO scaffold không hardcode GPIO   | Done                                |
| WP08-002 | Chốt part numbers/datasheets/power budget | Blocked — chưa chốt hardware        |
| WP08-003 | Board profile và RFID adapter             | Partial — code xong, chờ board thật |
| WP08-004 | Network/session state machine             | Done — host-tested                  |
| WP08-005 | CommandStore và replay protection         | Done — NVS + host tests             |
| WP08-006 | Actuator/indicator/sensor adapters        | Partial — chờ bench test            |
| WP08-007 | Fault/reboot/power tests                  | Partial — host tests; power pending |

## Evidence hiện có

- Non-blocking core trong `firmware/esp32-access-device/lib/device_core/`.
- ESP HTTP, NVS, MFRC522, relay, servo, reed switch và safe fixture adapters.
- `scripts/test-native.sh` cover allow, sensor/no-sensor, wrong device, expiry, clock, offline và pending ACK sau reboot.
- Scenario chung: `docs/protocol/device-protocol-scenarios.md`.
- Form phần cứng/nguồn: `docs/hardware/hardware-selection-and-wiring.md`.

WP08 chưa đạt Definition of Done/M4 tới khi có board thật, PlatformIO build/flash và evidence nguồn/wiring.

## Acceptance

- ESP32 và Simulator pass cùng protocol scenarios.
- Command sai Device/hết hạn/đã thấy không thực thi.
- Mất mạng/API/Vision giữ cửa đóng.
- Không có brownout/reset trong số lần lặp đã công bố.
- Không có sensor chỉ báo `APPLIED_UNCONFIRMED`.
- Sơ đồ dây và số đo nguồn được lưu làm evidence.
