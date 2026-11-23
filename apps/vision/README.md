# Vision Service

FastAPI service cho enrollment nhiều mẫu và xác minh khuôn mặt 1:1. Service chỉ trả evidence kỹ thuật; NestJS vẫn là nơi duy nhất quyết định cho phép/từ chối và phát lệnh mở cửa.

Mặc định service chạy bằng fixture không chứa dữ liệu sinh trắc học. Camera và engine nằm sau các port nên có thể đổi sang OpenCV + InsightFace bằng cấu hình mà không đổi use case.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8001
```

Các endpoint nội bộ yêu cầu `Authorization: Bearer $VISION_SERVICE_TOKEN`:

- `GET /health`: process đang sống.
- `GET /ready`: model đã sẵn sàng, kèm model version và pipeline fingerprint.
- `POST /internal/v1/enrollments`: thu 5–10 embedding đạt quality gate.
- `POST /internal/v1/verifications`: so sánh 1:1 với references NestJS cung cấp.

## Chạy model thật

```bash
pip install -e '.[dev,real]'
export VISION_CAMERA_PROVIDER=opencv
export VISION_MODEL_PATH=/absolute/path/to/model.onnx
export VISION_MODEL_CHECKSUM=<sha256>
export VISION_MODEL_VERSION=<immutable-version>
export VISION_EMBEDDING_DIMENSION=512
```

Model được nạp lazy, kiểm SHA-256 trước khi sử dụng và chạy CPU (`ctx_id=-1`). `/ready` trả 503 nếu model, checksum hoặc dependency chưa hợp lệ. Không commit model weight, ảnh gốc hoặc embedding vào repository/log.

## Kiểm thử

```bash
ruff check app tests
pytest
```

Fixture test bao phủ positive, negative, no-face, multi-face, low-quality, camera busy, timeout và reference không tương thích. Đây không phải số liệu accuracy hay liveness; calibration độc lập được thực hiện ở Week 6.
