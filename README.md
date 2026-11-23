# Face + RFID Access Control

Monorepo cho đồ án kiểm soát ra vào bằng RFID, xác minh khuôn mặt 1:1 và thiết bị IoT.

## Workspace

```text
apps/api                 NestJS API và Prisma
apps/admin               Next.js Admin
apps/vision              FastAPI scaffold; AI pipeline ở Week 3
apps/device-simulator    ESP32-compatible simulator scaffold
firmware/esp32-access-device
packages/shared          Shared Zod contracts
packages/ui              UI primitives tái sử dụng từ base repo
packages/hooks           Shared React hooks
```

## Yêu cầu

- Node.js 20+
- pnpm 9
- Docker + Docker Compose
- Python 3.11+ cho Vision

## Chạy lần đầu

```bash
cp .env.example .env.development
pnpm install
pnpm infra:dev:up
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm db:seed:dev
```

Tài khoản development seed:

- Email: `admin@example.com`
- Password: `ChangeMe123!`

Fixtures access-control:

- Access Point: `DOOR_01`
- Person hợp lệ: `P-DEMO`, RFID UID `04A1B2C3`
- Person bị khóa: `P-DISABLED`, RFID UID `04DEAD01`

UID chỉ dùng để mô phỏng local. Database lưu HMAC keyed và display hint, không lưu UID thô.

Đây chỉ là credential local; phải đổi hoặc loại bỏ khi triển khai ngoài môi trường development.

## Chạy dịch vụ

```bash
pnpm dev:api
pnpm dev:admin
pnpm dev:vision
DEVICE_TOKEN=development-device-token pnpm dev:simulator
```

Chạy scenario không cần nhập tương tác:

```bash
pnpm --filter @access/device-simulator build
DEVICE_TOKEN=development-device-token \
pnpm --filter @access/device-simulator start -- --scenario duplicate
```

Device API dùng `X-Device-Code`, `X-Access-Contract-Version` và bearer token. Token đăng ký/rotation chỉ hiển thị một lần; không đưa token production vào source hoặc log.

| Service       | URL                                         |
| ------------- | ------------------------------------------- |
| API           | `http://localhost:3000/api/v1`              |
| API liveness  | `http://localhost:3000/api/v1/health/live`  |
| API readiness | `http://localhost:3000/api/v1/health/ready` |
| Admin         | `http://localhost:3001`                     |
| Vision        | `http://localhost:8001/health`              |

## Kiểm tra chất lượng

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
```

## Trạng thái Week 1

- Workspace được selective-fork từ `booking-system-base`.
- Domain booking/tenant đã được loại khỏi workspace; source base gốc không nằm trong repository này.
- Có schema access-control, shared contracts, API health/auth, Admin shell/login, Vision/Simulator/Firmware scaffold.
- Chưa có access orchestration hoặc nhận dạng thật; các phần này thuộc Week 2 và Week 3.

Xem [kế hoạch triển khai](./docs/implementation-plan/README.md).
