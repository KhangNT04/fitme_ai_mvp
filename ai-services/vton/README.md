# FitMe AI VTON

FastAPI microservice for virtual try-on via Hugging Face Space (IDM-VTON).

## Run locally

```bash
cd ai-services/vton
pip install -e ".[dev]"
AI_MODE=mock uvicorn app.main:app --reload --port 8001
```

## Modes

| `AI_MODE` | Provider |
|-----------|----------|
| `mock` | Placeholder images (~1s delay) |
| `hf` | Hugging Face Space `yisol/IDM-VTON` via `gradio_client` |
| `local` | Self-host GPU (`fashn-vton-1.5`, optional) |

### HF Space mode

```bash
export AI_MODE=hf
export HF_TOKEN=hf_xxx          # recommended — reduces rate limits
export HF_SPACE=yisol/IDM-VTON  # default
uvicorn app.main:app --port 8001
```

Spring Boot backend:

```bash
export FITME_AI_MODE=hf
export AI_VTON_URL=http://localhost:8001
export FITME_PUBLIC_BASE_URL=http://localhost:8080
```

## Docker

```bash
docker build -t fitme-ai-vton .
docker run -p 8001:8001 -e AI_MODE=mock fitme-ai-vton
```

With compose profile:

```bash
docker compose --profile ai up -d
```

## Tests

```bash
pytest tests/ -q
```
