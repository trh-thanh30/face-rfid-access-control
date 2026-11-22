# Device Simulator

Simulator dùng cùng Device API contract với firmware. Lệnh start gửi một heartbeat đã xác thực; token chỉ được đọc từ environment và không được log.

```bash
DEVICE_CODE=ESP32_DOOR_01 \
DEVICE_TOKEN=development-device-token \
API_URL=http://localhost:3000 \
pnpm --filter @access/device-simulator start
```

Week 1 scaffold giữ contract của ESP32 trong khi phần cứng chưa chốt. Week 2 sẽ bổ sung heartbeat loop, RFID fixture, polling, command store và ACK.

```bash
DEVICE_TOKEN=development-device-token pnpm dev:simulator
```
