# FitMe AI — API Contract (FE ↔ BE)

Base URL: `/api/v1` (proxied via Next.js rewrite in dev/production).

## Headers

| Header | When |
|--------|------|
| `Authorization: Bearer <accessToken>` | Authenticated requests |
| `X-Anonymous-Session: <sessionToken>` | Anonymous session flows |
| `Content-Type: application/json` | JSON bodies (except multipart upload) |

## Response envelope

All endpoints return:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "message": null
}
```

Errors: `success: false`, HTTP 4xx/5xx, `error` or `message` populated.

## Service mapping

| Frontend service | Backend controller | Prefix |
|------------------|-------------------|--------|
| `session-api.ts` | `SessionController` | `/sessions` |
| `auth-api.ts` | `AuthController` | `/auth` |
| `profile-api.ts` | `ProfileController` | `/me` |
| `wardrobe-api.ts` | `WardrobeController` | `/wardrobe` |
| `product-api.ts` | `ProductController` | `/products` |
| `recommendation-api.ts` | `RecommendationController` | `/recommendations` |
| `tryon-api.ts` | `TryOnController` | `/try-on/requests` |
| `upload-api.ts` | `PhotoUploadController`, `PreviewController` | `/uploads`, `/previews` |
| `redirect-api.ts` | `RedirectController` | `/redirects` |
| `privacy-api.ts` | `PrivacyController` | `/privacy` |
| `brand-api.ts` | Brand controllers | `/brand`, `/brands` |
| `admin-api.ts` | `AdminController`, `AdminProductController` | `/admin` |

> **Note:** `profile-api.ts` re-exports `wardrobeApi` (deprecated) — prefer `@/services/wardrobe-api`.

## Key endpoints

### Session
- `POST /sessions/anonymous` — create anonymous session
- `GET /sessions/current` — current session (requires header)
- `POST /sessions/link-to-user` — link session after login

### Auth
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `POST /auth/forgot-password`, `POST /auth/reset-password`

### Profile & wardrobe
- `GET|POST /me/body-profile`, `GET|POST /me/style-profile`
- `GET|POST|PUT|DELETE /wardrobe/items`, `POST /wardrobe/items/{id}/image`

### Catalog
- `GET /products`, `GET /products/{id}`, `GET /products/similar`

### AI recommendation
- `POST /recommendations` — generate outfit
- `GET /recommendations/{id}`, `POST /recommendations/{id}/save`
- `GET /recommendations/saved`

### Try-on
- `POST /try-on/requests`, `POST /try-on/requests/{id}/items`
- `POST /try-on/requests/{id}/generate`, `GET /try-on/requests/{id}/result`

### Admin (role ADMIN)
- `GET /admin/dashboard`, `/admin/brands`, `/admin/flagged-links`
- `GET|POST|PUT|DELETE /admin/rules/styles`, `/admin/rules/occasions`
- `GET /admin/privacy/consents`, `/admin/privacy/deletion-requests`
- `GET /admin/try-on/failed-previews` — returns `PreviewGenerationDto[]`

Admin rule/privacy responses use DTOs (`StyleRuleDto`, `ConsentRecordDto`, etc.) with the same JSON field names as former entity responses.

## CI verification

GitHub Actions (`.github/workflows/ci.yml`):
1. `mvn test` — backend
2. `npm test` — frontend unit
3. `npm run build` — frontend compile
4. Playwright `smoke-routes` + `role-flows` — E2E

Local: `.\scripts\test-flows.ps1` or `bash scripts/ci-e2e.sh`
