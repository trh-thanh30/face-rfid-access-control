# Contract Versioning Policy

Tài liệu này áp dụng cho Device API, Vision API và file C++ sinh từ `@access/shared`. Phiên bản hiện tại là `1.0.0`.

## Quy tắc phiên bản

Contract dùng Semantic Versioning `MAJOR.MINOR.PATCH`:

- `MAJOR`: thay đổi breaking, ví dụ xóa/đổi tên field, đổi kiểu hoặc đổi ý nghĩa status.
- `MINOR`: thay đổi tương thích ngược, ví dụ thêm endpoint hoặc field optional.
- `PATCH`: sửa mô tả, example hoặc validation mà không làm payload hợp lệ hiện tại bị lỗi.

Mọi request Device/Vision phải gửi header `X-Access-Contract-Version`. API chỉ coi hai phiên bản tương thích khi cùng `MAJOR`; chuỗi sai SemVer hoặc khác `MAJOR` phải bị từ chối trước khi chạy nghiệp vụ. HTTP response khuyến nghị là `426 Upgrade Required` với mã lỗi `CONTRACT_VERSION_UNSUPPORTED`.

## Nguồn sự thật và generation

- TypeScript/Zod trong `packages/shared/src/contracts/` là nguồn sự thật cho constants và validation runtime.
- `docs/api/openapi.yaml` là contract HTTP dành cho implementer và review.
- `firmware/esp32-access-device/include/generated/access_contracts.h` được sinh từ shared constants; không sửa tay.
- Chạy `pnpm contracts:generate` sau khi đổi shared constants và `pnpm contracts:check` để phát hiện file sinh bị cũ.

## Rollout order

### Thay đổi tương thích ngược

1. Cập nhật shared schemas, OpenAPI, examples và contract tests.
2. Deploy provider trước: API/Vision chấp nhận cả payload cũ và mới.
3. Cập nhật Simulator, Admin và API consumer.
4. Generate header rồi cập nhật firmware cuối cùng.
5. Chỉ chuyển field optional thành required trong một bản `MAJOR` mới.

### Thay đổi breaking

1. Tạo base path mới, ví dụ `/api/device/v2`, nhưng vẫn giữ v1 trong thời gian migration.
2. Deploy API hỗ trợ song song v1/v2 và theo dõi version từ header.
3. Nâng Simulator trước để kiểm tra end-to-end, sau đó mới phát hành firmware.
4. Chỉ gỡ v1 khi không còn device cũ và đã có rollback image.

## Compatibility matrix

| Provider | Consumer | Kết quả                          |
| -------- | -------- | -------------------------------- |
| `1.x.y`  | `1.a.b`  | Tương thích                      |
| `1.x.y`  | `2.a.b`  | Từ chối trước nghiệp vụ          |
| `1.x.y`  | sai dạng | Từ chối trước nghiệp vụ          |
| v1 + v2  | v1/v2    | Chỉ trong giai đoạn dual rollout |

Không dùng firmware version thay cho contract version: hai vòng đời này độc lập.
