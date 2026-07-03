from __future__ import annotations

import os
from functools import lru_cache

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)

app = FastAPI(title="FitMe AI Embeddings", version="1.0.0")


class EmbedRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str


class SimilarityRequest(BaseModel):
    text_a: list[str] = Field(..., min_length=1)
    text_b: list[str] = Field(..., min_length=1)


class SimilarityResponse(BaseModel):
    similarities: list[list[float]]


class ProductIndexRequest(BaseModel):
    product_id: str
    text: str


@lru_cache(maxsize=1)
def _load_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODEL_NAME)


def _encode(texts: list[str]) -> np.ndarray:
    model = _load_model()
    vectors = model.encode(texts, normalize_embeddings=True)
    return np.asarray(vectors)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/v1/embed", response_model=EmbedResponse)
def embed(body: EmbedRequest) -> EmbedResponse:
    vectors = _encode(body.texts)
    return EmbedResponse(embeddings=vectors.tolist(), model=MODEL_NAME)


@app.post("/v1/similarity", response_model=SimilarityResponse)
def similarity(body: SimilarityRequest) -> SimilarityResponse:
    a = _encode(body.text_a)
    b = _encode(body.text_b)
    sim = a @ b.T
    return SimilarityResponse(similarities=sim.tolist())


@app.post("/v1/index/product", response_model=EmbedResponse)
def index_product(body: ProductIndexRequest) -> EmbedResponse:
    vectors = _encode([body.text])
    return EmbedResponse(embeddings=vectors.tolist(), model=MODEL_NAME)
