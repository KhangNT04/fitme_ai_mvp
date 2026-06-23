-- FitMe AI Schema V1

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums as check constraints via VARCHAR for flexibility

CREATE TABLE user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE anonymous_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    linked_user_id UUID REFERENCES user_accounts(id),
    privacy_version VARCHAR(50) NOT NULL DEFAULT '2026-01',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE body_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    height_cm INT NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL,
    fit_preference VARCHAR(50) NOT NULL DEFAULT 'REGULAR',
    skin_tone VARCHAR(50) NOT NULL DEFAULT 'UNSURE',
    goals JSONB,
    shoulder_width_cm DECIMAL(6,2),
    chest_cm DECIMAL(6,2),
    waist_cm DECIMAL(6,2),
    abdomen_cm DECIMAL(6,2),
    hip_cm DECIMAL(6,2),
    thigh_cm DECIMAL(6,2),
    inseam_cm DECIMAL(6,2),
    arm_length_cm DECIMAL(6,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE style_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    primary_style VARCHAR(100) NOT NULL,
    secondary_styles JSONB,
    risk_level VARCHAR(50) NOT NULL DEFAULT 'BALANCED',
    artistic_mode BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_colors JSONB,
    avoided_colors JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES user_accounts(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    shopee_url TEXT,
    tiktok_shop_url TEXT,
    instagram_url TEXT,
    facebook_url TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(12,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    material VARCHAR(100),
    fit_type VARCHAR(50) DEFAULT 'REGULAR',
    purchase_url TEXT,
    purchase_channel VARCHAR(50),
    stock_status VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
    ai_try_on_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type VARCHAR(50) NOT NULL DEFAULT 'MAIN',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color_name VARCHAR(100),
    color_hex VARCHAR(20),
    size_label VARCHAR(50),
    sku VARCHAR(100),
    stock_status VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE product_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_type VARCHAR(50) NOT NULL,
    tag_value VARCHAR(100) NOT NULL
);

CREATE TABLE size_charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_label VARCHAR(50) NOT NULL,
    chest_cm DECIMAL(6,2),
    waist_cm DECIMAL(6,2),
    hip_cm DECIMAL(6,2),
    shoulder_cm DECIMAL(6,2),
    length_cm DECIMAL(6,2),
    inseam_cm DECIMAL(6,2),
    weight_min_kg DECIMAL(5,2),
    weight_max_kg DECIMAL(5,2),
    height_min_cm INT,
    height_max_cm INT,
    note TEXT
);

CREATE TABLE wardrobe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    name VARCHAR(255) NOT NULL,
    item_type VARCHAR(100),
    category VARCHAR(100),
    color VARCHAR(100),
    material VARCHAR(100),
    fit_type VARCHAR(50),
    style_tags JSONB,
    image_url TEXT,
    source_type VARCHAR(50) NOT NULL DEFAULT 'USER_WARDROBE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE outfit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    selected_product_id UUID REFERENCES products(id),
    occasion VARCHAR(255) NOT NULL,
    desired_vibe TEXT,
    wardrobe_mode VARCHAR(50) NOT NULL DEFAULT 'NO_WARDROBE_DATA',
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outfit_request_id UUID REFERENCES outfit_requests(id),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    title VARCHAR(255),
    recommended_size VARCHAR(50),
    alternative_size VARCHAR(50),
    recommended_form VARCHAR(100),
    recommended_color VARCHAR(100),
    confidence VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    explanation_body TEXT,
    explanation_style TEXT,
    explanation_occasion TEXT,
    explanation_color TEXT,
    explanation_wardrobe TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'GENERATED',
    saved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE recommendation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    wardrobe_item_id UUID REFERENCES wardrobe_items(id),
    role VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    selected_size VARCHAR(50),
    selected_color VARCHAR(100),
    price DECIMAL(12,2),
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    consent_type VARCHAR(50) NOT NULL,
    consent_version VARCHAR(50) NOT NULL,
    accepted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_photo_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    consent_id UUID REFERENCES consent_records(id),
    quality_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE preview_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES recommendations(id),
    try_on_request_id UUID,
    photo_upload_id UUID REFERENCES user_photo_uploads(id),
    preview_type VARCHAR(50) NOT NULL DEFAULT 'OUTFIT_BOARD',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    preview_image_url TEXT,
    error_message TEXT,
    disclaimer TEXT NOT NULL DEFAULT 'Ảnh minh họa bằng AI, dùng để tham khảo. Form thực tế có thể khác tùy chất liệu, bảng size và cách mặc.',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE try_on_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    photo_upload_id UUID REFERENCES user_photo_uploads(id),
    occasion VARCHAR(255),
    desired_vibe TEXT,
    preferred_fit VARCHAR(50),
    comfort_preference VARCHAR(50),
    normally_worn_top_size VARCHAR(50),
    normally_worn_bottom_size VARCHAR(50),
    height_cm INT,
    weight_kg DECIMAL(5,2),
    skin_tone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE preview_generations
    ADD CONSTRAINT fk_preview_try_on FOREIGN KEY (try_on_request_id) REFERENCES try_on_requests(id);

CREATE TABLE try_on_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    try_on_request_id UUID NOT NULL REFERENCES try_on_requests(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    role VARCHAR(50) NOT NULL,
    selected_size VARCHAR(50),
    selected_color VARCHAR(100)
);

CREATE TABLE buy_click_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    product_id UUID NOT NULL REFERENCES products(id),
    recommendation_id UUID REFERENCES recommendations(id),
    try_on_request_id UUID REFERENCES try_on_requests(id),
    selected_size VARCHAR(50),
    selected_color VARCHAR(100),
    source_page VARCHAR(255),
    purchase_url TEXT NOT NULL,
    channel VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    recommendation_id UUID REFERENCES recommendations(id),
    try_on_request_id UUID REFERENCES try_on_requests(id),
    rating VARCHAR(50) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE flagged_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    purchase_url TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE TABLE data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES user_accounts(id),
    session_id UUID REFERENCES anonymous_sessions(id),
    product_id UUID REFERENCES products(id),
    brand_id UUID REFERENCES brands(id),
    recommendation_id UUID REFERENCES recommendations(id),
    try_on_request_id UUID REFERENCES try_on_requests(id),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE style_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    keywords JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE occasion_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    keywords JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_recommendations_session ON recommendations(session_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_brand ON analytics_events(brand_id);
CREATE INDEX idx_buy_click_product ON buy_click_events(product_id);
