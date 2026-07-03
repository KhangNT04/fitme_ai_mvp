-- Brand subscription & quota billing

CREATE TABLE billing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(32) NOT NULL,
    price_vnd BIGINT NOT NULL,
    quota_amount INT NOT NULL,
    includes_dashboard BOOLEAN NOT NULL DEFAULT FALSE,
    billing_period_days INT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE brand_billing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
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

CREATE INDEX idx_brand_billing_orders_brand ON brand_billing_orders(brand_id);
CREATE INDEX idx_brand_billing_orders_status ON brand_billing_orders(status);

CREATE TABLE brand_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL UNIQUE REFERENCES brands(id),
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_order_id UUID REFERENCES brand_billing_orders(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brand_subscriptions_expires ON brand_subscriptions(expires_at);

CREATE TABLE brand_quota_balances (
    brand_id UUID PRIMARY KEY REFERENCES brands(id),
    subscription_remaining INT NOT NULL DEFAULT 0,
    topup_remaining INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE brand_quota_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    entry_type VARCHAR(32) NOT NULL,
    delta INT NOT NULL,
    balance_after INT NOT NULL,
    reference_type VARCHAR(64),
    reference_id UUID,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brand_quota_ledger_brand ON brand_quota_ledger(brand_id);
CREATE UNIQUE INDEX uq_quota_ledger_try_on_consume
    ON brand_quota_ledger(brand_id, reference_id)
    WHERE entry_type = 'CONSUME' AND reference_type = 'TRY_ON_REQUEST';

INSERT INTO billing_plans (code, name, plan_type, price_vnd, quota_amount, includes_dashboard, billing_period_days, sort_order)
VALUES
    ('SUB_STARTER', 'Starter', 'SUBSCRIPTION', 199000, 1000, TRUE, 30, 10),
    ('SUB_GROWTH', 'Growth', 'SUBSCRIPTION', 499000, 3000, TRUE, 30, 20),
    ('SUB_PRO', 'Pro', 'SUBSCRIPTION', 999000, 7000, TRUE, 30, 30),
    ('TOPUP_150', 'Top-up 150 lượt', 'TOPUP', 50000, 150, FALSE, NULL, 40),
    ('TOPUP_250', 'Top-up 250 lượt', 'TOPUP', 100000, 250, FALSE, NULL, 50);
