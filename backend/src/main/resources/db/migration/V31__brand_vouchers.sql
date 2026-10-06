-- Phase 5: admin voucher campaigns issue single-use Brand Plus discount codes to brands the admin picks.
-- A voucher covers one purchase (one period) and never stacks with the plan's time-boxed discount.

CREATE TABLE voucher_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_percent INT NOT NULL
        CONSTRAINT chk_voucher_campaigns_percent CHECK (discount_percent BETWEEN 1 AND 100),
    vouchers_per_brand INT NOT NULL
        CONSTRAINT chk_voucher_campaigns_per_brand CHECK (vouchers_per_brand >= 1),
    max_brands INT NOT NULL
        CONSTRAINT chk_voucher_campaigns_max_brands CHECK (max_brands >= 1),
    valid_from TIMESTAMPTZ NULL,
    valid_until TIMESTAMPTZ NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_voucher_campaigns_window
        CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_until > valid_from)
);

CREATE TABLE brand_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES voucher_campaigns(id),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    -- Snapshot of the campaign percent at issue time; later campaign edits never change issued vouchers.
    discount_percent INT NOT NULL
        CONSTRAINT chk_brand_vouchers_percent CHECK (discount_percent BETWEEN 1 AND 100),
    status VARCHAR(16) NOT NULL DEFAULT 'ISSUED'
        CONSTRAINT chk_brand_vouchers_status
            CHECK (status IN ('ISSUED', 'RESERVED', 'USED', 'REVOKED', 'EXPIRED')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Campaign valid_until at issue time; NULL never expires.
    expires_at TIMESTAMPTZ NULL,
    -- The PENDING checkout holding the voucher; cleared when that order is paid, cancelled, failed or expired.
    reserved_order_id UUID NULL REFERENCES brand_billing_orders(id) ON DELETE SET NULL,
    used_order_id UUID NULL REFERENCES brand_billing_orders(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    revoked_by UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_vouchers_brand_status ON brand_vouchers(brand_id, status);
CREATE INDEX idx_brand_vouchers_campaign ON brand_vouchers(campaign_id);
-- One voucher per order.
CREATE UNIQUE INDEX uq_brand_vouchers_reserved_order ON brand_vouchers(reserved_order_id)
    WHERE reserved_order_id IS NOT NULL;
CREATE UNIQUE INDEX uq_brand_vouchers_used_order ON brand_vouchers(used_order_id)
    WHERE used_order_id IS NOT NULL;

ALTER TABLE brand_billing_orders
    ADD CONSTRAINT fk_brand_billing_orders_voucher
        FOREIGN KEY (voucher_id) REFERENCES brand_vouchers(id) ON DELETE SET NULL;

-- Template campaign; the admin picks which brands receive it.
INSERT INTO voucher_campaigns (name, description, discount_percent, vouchers_per_brand, max_brands, active)
VALUES ('Brand tiên phong', 'Ưu đãi cho brand tiên phong', 50, 3, 5, TRUE);
