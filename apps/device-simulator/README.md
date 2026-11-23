# Device Simulator

Node.js client dùng cùng Device API contract với ESP32. Simulator không quyết định quyền hoặc chọn Person; nó chỉ gửi RFID event, poll kết quả từ NestJS, kiểm tra command, mô phỏng actuator và ACK.

## Chạy interactive

```bash
pnpm --filter @access/device-simulator build
DEVICE_TOKEN=development-device-token \
pnpm --filter @access/device-simulator start -- --interactive
```

## Chạy scenario

```bash
DEVICE_TOKEN=development-device-token \
pnpm --filter @access/device-simulator start -- --scenario allowed

DEVICE_TOKEN=development-device-token \
pnpm --filter @access/device-simulator start -- --scenario duplicate \
  --request-id demo-retry-01

DEVICE_TOKEN=development-device-token \
pnpm --filter @access/device-simulator start -- --scenario denied
```

Scenario có sẵn: `allowed`, `denied`, `disabled-person`, `timeout`, `duplicate`, `network-error`. Tên scenario chỉ chọn input/hành vi transport; kết quả allow/deny vẫn do API quyết định.

Có thể truyền UID riêng:

```bash
DEVICE_TOKEN=development-device-token \
pnpm --filter @access/device-simulator start -- \
  --uid 04A1B2C3 --request-id manual-01
```

## Environment

| Biến                              | Mặc định                              |
| --------------------------------- | ------------------------------------- |
| `API_URL`                         | `http://localhost:3000`               |
| `DEVICE_CODE`                     | `ESP32_DOOR_01`                       |
| `DEVICE_TOKEN`                    | Bắt buộc                              |
| `SIMULATOR_HEARTBEAT_INTERVAL_MS` | `10000`                               |
| `SIMULATOR_POLL_INITIAL_MS`       | `250`                                 |
| `SIMULATOR_POLL_MAX_MS`           | `1000`                                |
| `SIMULATOR_POLL_TIMEOUT_MS`       | `12000`                               |
| `SIMULATOR_ACK_RETRY_MS`          | `500`                                 |
| `SIMULATOR_ACK_MAX_ATTEMPTS`      | `5`                                   |
| `SIMULATOR_STATE_FILE`            | `.simulator-state/seen-commands.json` |
| `SIMULATOR_ALLOWED_UID`           | Development seed fixture              |
| `SIMULATOR_DENIED_UID`            | Unknown-card fixture                  |
| `SIMULATOR_DISABLED_PERSON_UID`   | Disabled-person fixture               |

Command ID được ghi vào state file trước khi actuator chạy. Nếu process dừng giữa chừng, lần chạy sau không mở cửa lại mà gửi ACK `UNKNOWN`. Token và UID đầy đủ không được ghi vào log/state file.
