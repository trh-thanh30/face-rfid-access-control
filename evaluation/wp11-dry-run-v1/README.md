# WP11 synthetic dry-run v1

Đây là dữ liệu **SYNTHETIC_DRY_RUN** chỉ để kiểm chứng schema, công thức và khả năng tái lập. Không được dùng các số trong `results/` làm FAR/FRR/accuracy đo được của hệ thống thật.

## Tái tạo

```bash
pnpm evaluation:test
pnpm evaluation:generate
```

Với evaluation version khác, chạy `node evaluation/tools/evaluate.mjs evaluation/<version>`.

Script luôn chọn threshold từ `CALIBRATION`; chỉ sau đó mới tính kết quả `TEST`. Output trong `results/` được tạo lại hoàn toàn từ CSV nguồn và có manifest SHA-256.

- [Protocol](./protocol.md)
- [Data dictionary](./data-dictionary.md)
- [Limitations và threats to validity](./limitations.md)
- [Generated summary](./results/summary.md)

## Thay bằng final run

1. Copy cả thư mục thành evaluation version mới, không sửa/xóa dry-run.
2. Chốt `protocol.md` và `config.json` trước capture; đặt `status: LOCKED`.
3. Dùng participant ID ẩn danh; enrollment/calibration/test là các lần thu độc lập.
4. Ghi mọi attempt một lần vào raw CSV. Không chạy lại có chọn lọc.
5. Exclusion chỉ dùng rule đã có trong `predeclaredExclusionRules` trước final run.
6. Không commit ảnh, video hoặc dữ liệu nhận dạng thật; chỉ commit manifest nếu policy lưu trữ không cho phép.
7. Chỉ archive bản final từ commit sạch; `manifest.json` ghi HEAD revision và checksum của mọi input.
