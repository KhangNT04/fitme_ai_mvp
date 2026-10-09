-- Catalog images (brand logos, product photos) copied from the source CDN into FitMe storage,
-- so the storefront and AI try-on never depend on hotlinking a marketplace CDN.
CREATE TABLE catalog_media_mirror (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT NOT NULL UNIQUE,
    stored_path TEXT NOT NULL,
    -- Direct public URL (e.g. R2 public bucket) when it was verified reachable; NULL = serve stored_path via the backend.
    public_url TEXT,
    content_type VARCHAR(100),
    size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
