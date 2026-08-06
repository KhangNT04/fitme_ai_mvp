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
| `api` | **FASHN hosted API** (https://api.fashn.ai) — requires `FASHN_API_KEY` |
| `hf` | Hugging Face Space `yisol/IDM-VTON` via `gradio_client` |
| `local` | Self-host GPU (`fashn-vton-1.5`, optional) |

### FASHN API mode (recommended — this is the plan you already bought)

```bash
export AI_MODE=api
export FASHN_API_KEY=fa-xxx            # https://app.fashn.ai/api → Create new API key
export FASHN_MODEL_NAME=tryon-v1.6     # default; use tryon-max for 4K / shoes-hats-jewelry-bags
uvicorn app.main:app --port 8001
```

**Important:** `api.fashn.ai` fetches `person_image_url` / `garment_image_url` over the
public internet, so a raw `http://localhost:...` URL would normally fail. **This service
works around that automatically** — `app/local_image_inline.py` detects `localhost`/
`127.0.0.1` image URLs, fetches the bytes itself (it can reach the backend directly: same
host in native dev, or via `AI_VTON_INTERNAL_FETCH_BASE_URL=http://backend:8080` in Docker
Compose), and sends FASHN a base64 data URI instead of the URL — FASHN's `model_image` /
`garment_image` inputs accept either (see [tryon-v1.6
docs](https://docs.fashn.ai/api-reference/tryon-v1-6#input-parameters)). **No ngrok tunnel
needed for local dev.** Production (Render/Vercel/R2) already uses public URLs, so this is
a no-op there. See `docs/LOCAL_AI_DEV.md` for the full local setup.

Env vars for the local-image inlining behavior above (all optional, sane defaults):

| Var | Default | Meaning |
|-----|---------|---------|
| `AI_VTON_INTERNAL_FETCH_BASE_URL` | _(empty)_ | Rewrite `localhost`/`127.0.0.1` image URLs to this base before fetching (e.g. `http://backend:8080` when ai-vton runs in its own Docker container). Leave unset for native dev. |
| `FASHN_LOCAL_HOSTS` | `localhost,127.0.0.1,0.0.0.0` | Hostnames treated as "local" (needs inlining). |
| `FASHN_INLINE_LOCAL_IMAGES` | `true` | Set `false` to disable and always send the raw URL (e.g. if you're using ngrok yourself and want the old behavior). |
| `FASHN_INLINE_MAX_BYTES` | `10485760` (10MB) | Images larger than this fall back to the raw URL instead of inlining. |

**One call = one garment.** FASHN's `/v1/run` renders exactly one `garment_image` onto
one `model_image` per call (see https://docs.fashn.ai/api-reference/tryon-v1-6). A full
outfit (top + bottom) is rendered as two chained calls — see [§1 in
FASHN_VTON_INTEGRATION.md](../../docs/FASHN_VTON_INTEGRATION.md) for the `garments: [...]`
request shape and `app/sequence.py` for the chaining logic. This works with every
provider in this service, not just `api`.

### HF Space mode

```bash
export AI_MODE=hf
export HF_TOKEN=hf_xxx          # recommended — reduces rate limits
export HF_SPACE=yisol/IDM-VTON  # default
uvicorn app.main:app --port 8001
```

Spring Boot backend:

```bash
export FITME_AI_MODE=api   # or hf / local — mirrors AI_MODE above
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
