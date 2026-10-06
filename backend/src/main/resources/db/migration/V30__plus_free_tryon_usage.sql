-- Phase 4: daily free AI try-ons when every item belongs to a Brand Plus brand (limit: tryon.plus_free_daily).
-- One row per try-on that used a free try instead of Fitken; REFUNDED rows (failed renders) give the try back.

CREATE TABLE plus_free_tryon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    -- Calendar day in Asia/Ho_Chi_Minh.
    usage_date DATE NOT NULL,
    -- The preview generation (VTON job) the free try paid for; the same key Fitken charges use.
    try_on_ref UUID NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'USED'
        CONSTRAINT chk_plus_free_tryon_usage_status CHECK (status IN ('USED', 'REFUNDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    refunded_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_plus_free_tryon_usage_ref UNIQUE (try_on_ref)
);

CREATE INDEX idx_plus_free_tryon_usage_user_date ON plus_free_tryon_usage(user_id, usage_date);
