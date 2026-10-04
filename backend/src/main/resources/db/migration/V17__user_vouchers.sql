-- Consumer vouchers (B2C pivot). Pro subscription grants FREESHIP vouchers; checkout reserves/uses them.

CREATE TABLE user_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    voucher_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    max_discount_vnd BIGINT NOT NULL,
    source_type VARCHAR(64) NOT NULL,
    source_ref UUID,
    order_id UUID,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_vouchers_user_status ON user_vouchers(user_id, status);
CREATE INDEX idx_user_vouchers_order ON user_vouchers(order_id);
