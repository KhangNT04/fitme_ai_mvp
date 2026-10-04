-- B2C pivot: consumers pay for FitMe Pro (Fitken + freeship vouchers); brand quota billing is retired.

DROP TABLE IF EXISTS brand_quota_ledger;
DROP TABLE IF EXISTS brand_quota_balances;
DROP TABLE IF EXISTS brand_subscriptions;
DROP TABLE IF EXISTS brand_billing_orders;

-- billing_plans now only holds consumer plans; quota_amount = Fitken granted per period.
DELETE FROM billing_plans;
ALTER TABLE billing_plans DROP COLUMN includes_dashboard;
ALTER TABLE billing_plans
    ADD COLUMN freeship_vouchers INT NOT NULL DEFAULT 0,
    ADD COLUMN freeship_max_discount_vnd BIGINT NOT NULL DEFAULT 30000;

INSERT INTO billing_plans (code, name, plan_type, price_vnd, quota_amount, billing_period_days,
                           freeship_vouchers, freeship_max_discount_vnd, sort_order)
VALUES ('PRO_MONTHLY', 'FitMe Pro', 'SUBSCRIPTION', 49000, 15, 30, 2, 30000, 10);

-- Fitken wallet: subscription bucket resets on expiry, bonus bucket (trial/rewards/admin) never expires.
CREATE TABLE fitken_wallets (
    user_id UUID PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,
    subscription_remaining INT NOT NULL DEFAULT 0 CHECK (subscription_remaining >= 0),
    bonus_remaining INT NOT NULL DEFAULT 0 CHECK (bonus_remaining >= 0),
    trial_granted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE fitken_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    entry_type VARCHAR(32) NOT NULL,
    delta INT NOT NULL,
    subscription_delta INT NOT NULL DEFAULT 0,
    bonus_delta INT NOT NULL DEFAULT 0,
    balance_after INT NOT NULL,
    reference_type VARCHAR(64),
    reference_id UUID,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fitken_ledger_user ON fitken_ledger(user_id, created_at DESC);
CREATE UNIQUE INDEX uq_fitken_ledger_reference
    ON fitken_ledger(entry_type, reference_type, reference_id)
    WHERE reference_id IS NOT NULL
      AND entry_type IN ('CONSUME', 'REFUND', 'SUBSCRIPTION_GRANT', 'TOPUP_GRANT',
                         'CHECKIN_REWARD', 'SHARE_REWARD', 'REVIEW_REWARD');

CREATE TABLE consumer_billing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    amount_vnd BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    payos_order_code BIGINT NOT NULL UNIQUE,
    payos_payment_link_id VARCHAR(255),
    checkout_url TEXT,
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consumer_billing_orders_user ON consumer_billing_orders(user_id, created_at DESC);

CREATE TABLE consumer_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES user_accounts(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_order_id UUID REFERENCES consumer_billing_orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consumer_subscriptions_expiry ON consumer_subscriptions(status, expires_at);

-- Former Plus users keep Pro for one period (no Fitken grant) so the derived plan stays PRO.
UPDATE user_accounts SET consumer_plan = 'PRO' WHERE consumer_plan = 'PLUS';
INSERT INTO consumer_subscriptions (user_id, plan_id, status, starts_at, expires_at)
SELECT u.id, p.id, 'ACTIVE', NOW(), NOW() + INTERVAL '30 days'
FROM user_accounts u
CROSS JOIN billing_plans p
WHERE u.consumer_plan = 'PRO' AND p.code = 'PRO_MONTHLY';

CREATE TABLE daily_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    streak INT NOT NULL,
    reward_granted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, checkin_date)
);

CREATE TABLE social_share_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    post_url TEXT NOT NULL UNIQUE,
    platform VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
    reward_granted INT NOT NULL DEFAULT 0,
    try_on_request_id UUID,
    gallery_image_id UUID,
    claim_date DATE NOT NULL,
    admin_note TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_share_claims_user_date ON social_share_claims(user_id, claim_date);
CREATE INDEX idx_share_claims_status ON social_share_claims(status, created_at DESC);

CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'VISIBLE',
    reward_granted INT NOT NULL DEFAULT 0,
    hidden_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, user_id)
);

CREATE INDEX idx_product_reviews_product ON product_reviews(product_id, status, created_at DESC);
CREATE INDEX idx_product_reviews_status ON product_reviews(status, created_at DESC);

CREATE TABLE product_review_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_review_images_review ON product_review_images(review_id, sort_order);

CREATE TABLE outfit_gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    try_on_request_id UUID,
    preview_generation_id UUID NOT NULL UNIQUE,
    image_url TEXT NOT NULL,
    preview_source VARCHAR(32),
    product_ids TEXT,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outfit_gallery_user ON outfit_gallery_images(user_id, created_at DESC) WHERE deleted_at IS NULL;
