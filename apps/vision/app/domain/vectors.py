import math
from statistics import median


def normalize(vector: list[float], expected_dimension: int) -> list[float]:
    if len(vector) != expected_dimension or not all(math.isfinite(value) for value in vector):
        raise ValueError("Embedding has invalid dimension or non-finite values")
    norm = math.sqrt(sum(value * value for value in vector))
    if norm <= 0:
        raise ValueError("Embedding norm must be positive")
    return [value / norm for value in vector]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right):
        raise ValueError("Embedding dimensions differ")
    return max(-1.0, min(1.0, sum(a * b for a, b in zip(left, right, strict=True))))


def session_similarity(frame_embeddings: list[list[float]], references: list[list[float]]) -> float:
    per_frame = [
        max(cosine_similarity(frame, reference) for reference in references)
        for frame in frame_embeddings
    ]
    return float(median(per_frame))
