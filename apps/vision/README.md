# Vision Service

Week 1 scaffold cho dịch vụ FastAPI. Dịch vụ chỉ cung cấp health/readiness; OpenCV và InsightFace được bổ sung ở Week 3 để không biến model giả thành kết quả nhận dạng thật.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8001
```
