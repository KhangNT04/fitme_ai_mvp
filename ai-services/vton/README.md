# FitMe AI VTON

FastAPI microservice for virtual try-on (FASHN hybrid).

## Run locally

```bash
cd ai-services/vton
pip install -e ".[dev]"
AI_MODE=mock uvicorn app.main:app --reload --port 8001
```

## Modes

| `AI_MODE` | Provider |
|-----------|----------|
| `mock` | Placeholder images |
| `api` | FASHN hosted API (`FASHN_API_KEY`) |
| `local` | Self-host GPU (`fashn-vton-1.5`) |

## Docker

```bash
docker build -t fitme-ai-vton .
docker run -p 8001:8001 -e AI_MODE=mock fitme-ai-vton
```
