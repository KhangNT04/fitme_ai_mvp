-- Phase 3: brands get one paid plan (FitMe Brand Plus); plans can carry a time-boxed percentage discount.

ALTER TABLE billing_plans
    ADD COLUMN audience VARCHAR(16) NOT NULL DEFAULT 'CONSUMER'
        CONSTRAINT chk_billing_plans_audience CHECK (audience IN ('CONSUMER', 'BRAND')),
    ADD COLUMN discount_percent INT NULL
        CONSTRAINT chk_billing_plans_discount_percent CHECK (discount_percent BETWEEN 0 AND 100),
    ADD COLUMN discount_starts_at TIMESTAMPTZ NULL,
    ADD COLUMN discount_ends_at TIMESTAMPTZ NULL,
    ADD CONSTRAINT chk_billing_plans_discount_window
        CHECK (discount_starts_at IS NULL OR discount_ends_at IS NULL OR discount_ends_at > discount_starts_at);

INSERT INTO billing_plans (code, name, plan_type, price_vnd, quota_amount, billing_period_days, active, sort_order,
                           audience)
VALUES ('BRAND_PLUS', 'FitMe Brand Plus', 'SUBSCRIPTION', 999000, 0, 30, TRUE, 100, 'BRAND')
ON CONFLICT (code) DO NOTHING;

-- Every new PayOS order code (consumer and brand checkouts) comes from this one sequence, so a code can never
-- exist in both consumer_billing_orders and brand_billing_orders and the shared webhook dispatches unambiguously.
-- It starts above every legacy time-based consumer code (always < 9 * 10^10) and stays far below the PayOS
-- orderCode ceiling (2^53 - 1).
CREATE SEQUENCE payos_order_code_seq START WITH 1000000000000;

CREATE TABLE brand_billing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    order_code BIGINT NOT NULL UNIQUE DEFAULT nextval('payos_order_code_seq'),
    list_price BIGINT NOT NULL,
    discount_percent_applied INT NOT NULL DEFAULT 0
        CONSTRAINT chk_brand_billing_orders_discount CHECK (discount_percent_applied BETWEEN 0 AND 100),
    amount BIGINT NOT NULL CONSTRAINT chk_brand_billing_orders_amount CHECK (amount >= 0),
    -- Phase 5 adds brand_vouchers and the foreign key.
    voucher_id UUID NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
        CONSTRAINT chk_brand_billing_orders_status
            CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED')),
    payos_payment_link_id VARCHAR(255),
    checkout_url TEXT,
    paid_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_billing_orders_brand ON brand_billing_orders(brand_id, created_at DESC);
CREATE INDEX idx_brand_billing_orders_pending ON brand_billing_orders(created_at) WHERE status = 'PENDING';

-- One row per brand: renewals extend ends_at, the purchase history lives in brand_billing_orders.
CREATE TABLE brand_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL UNIQUE REFERENCES brands(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
        CONSTRAINT chk_brand_subscriptions_status CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    last_order_id UUID REFERENCES brand_billing_orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_subscriptions_brand_ends ON brand_subscriptions(brand_id, ends_at);
CREATE INDEX idx_brand_subscriptions_status_ends ON brand_subscriptions(status, ends_at);
