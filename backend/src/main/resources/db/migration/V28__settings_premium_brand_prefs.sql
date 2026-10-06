-- Phase 2: admin-editable runtime settings, consumer Pro renamed to Premium, Premium brand preferences.

CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID NULL
);

INSERT INTO system_settings (key, value) VALUES
    ('fitken.max_balance', '50'),
    ('tryon.plus_free_daily', '3'),
    ('recommendation.plus_boost', '15')
ON CONFLICT (key) DO NOTHING;

-- Consumer plan FitMe Pro is now FitMe Premium (the PLUS name is reserved for the brand plan).
UPDATE user_accounts SET consumer_plan = 'PREMIUM' WHERE consumer_plan IN ('PRO', 'PLUS');
UPDATE billing_plans SET code = 'PREMIUM_MONTHLY', name = 'FitMe Premium' WHERE code = 'PRO_MONTHLY';

CREATE TABLE user_favorite_brands (
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, brand_id)
);

CREATE INDEX idx_user_favorite_brands_brand ON user_favorite_brands(brand_id);

ALTER TABLE user_accounts
    ADD COLUMN brand_mix_mode VARCHAR(20) NOT NULL DEFAULT 'DIVERSE'
        CHECK (brand_mix_mode IN ('DIVERSE', 'FAVORITES_ONLY'));
