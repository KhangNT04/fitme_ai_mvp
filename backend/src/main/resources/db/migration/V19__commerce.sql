ALTER TABLE product_variants
    ADD COLUMN stock_quantity INT NOT NULL DEFAULT 100 CHECK (stock_quantity >= 0);

ALTER TABLE brands
    ADD COLUMN bank_name VARCHAR(255),
    ADD COLUMN bank_account_number VARCHAR(100),
    ADD COLUMN bank_account_name VARCHAR(255);

CREATE TABLE shipping_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    province VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    ward VARCHAR(100) NOT NULL,
    street TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES user_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, variant_id)
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id),
    order_code VARCHAR(30) NOT NULL UNIQUE,
    payos_order_code BIGINT UNIQUE,
    status VARCHAR(30) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    subtotal_vnd BIGINT NOT NULL,
    shipping_fee_vnd BIGINT NOT NULL,
    discount_vnd BIGINT NOT NULL DEFAULT 0,
    total_vnd BIGINT NOT NULL,
    voucher_id UUID REFERENCES user_vouchers(id),
    recipient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    province VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    ward VARCHAR(100) NOT NULL,
    street TEXT NOT NULL,
    note TEXT,
    cancel_reason TEXT,
    paid_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE seller_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    subtotal_vnd BIGINT NOT NULL,
    commission_vnd BIGINT NOT NULL,
    payout_vnd BIGINT NOT NULL,
    payout_ref VARCHAR(255),
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE seller_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    brand_id UUID NOT NULL REFERENCES brands(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    subtotal_vnd BIGINT NOT NULL,
    shipping_fee_vnd BIGINT NOT NULL,
    commission_vnd BIGINT NOT NULL,
    payout_vnd BIGINT NOT NULL,
    settlement_id UUID REFERENCES seller_settlements(id),
    cancel_reason TEXT,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, brand_id)
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id UUID NOT NULL REFERENCES seller_orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    product_name VARCHAR(255) NOT NULL,
    variant_label VARCHAR(255),
    image_url TEXT,
    unit_price_vnd BIGINT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total_vnd BIGINT NOT NULL
);

CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    provider VARCHAR(30) NOT NULL,
    provider_order_code BIGINT,
    status VARCHAR(30) NOT NULL,
    amount_vnd BIGINT NOT NULL,
    raw_payload TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id UUID NOT NULL UNIQUE REFERENCES seller_orders(id),
    carrier VARCHAR(30) NOT NULL,
    tracking_code VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'READY_TO_PICK',
    estimated_delivery_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE shipment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON shipping_addresses(user_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_seller_orders_brand ON seller_orders(brand_id, created_at DESC);
CREATE INDEX idx_seller_orders_status ON seller_orders(status);
CREATE INDEX idx_order_items_seller ON order_items(seller_order_id);
CREATE INDEX idx_payments_order ON payment_transactions(order_id);
CREATE INDEX idx_shipment_events_shipment ON shipment_events(shipment_id, occurred_at);
CREATE INDEX idx_settlements_brand ON seller_settlements(brand_id, created_at DESC);
