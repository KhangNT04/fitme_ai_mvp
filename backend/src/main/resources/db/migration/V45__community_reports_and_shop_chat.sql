-- Community reports + brand↔shopper inbox (HTTP polling; no realtime transport yet).

CREATE TABLE community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    target_type VARCHAR(32) NOT NULL
        CHECK (target_type IN ('POST', 'COMMENT', 'USER', 'CHAT_MESSAGE')),
    target_id UUID NOT NULL,
    reason VARCHAR(64) NOT NULL,
    detail TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
    resolved_by UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolution_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_community_reports_status ON community_reports(status, created_at DESC);
CREATE INDEX idx_community_reports_target ON community_reports(target_type, target_id);
CREATE UNIQUE INDEX uq_community_reports_open_once
    ON community_reports(reporter_user_id, target_type, target_id)
    WHERE status = 'OPEN';

CREATE TABLE shop_chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    try_on_request_id UUID,
    community_post_id UUID REFERENCES community_posts(id) ON DELETE SET NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'CLOSED', 'LOCKED')),
    last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_message_preview VARCHAR(280),
    user_unread_count INT NOT NULL DEFAULT 0,
    brand_unread_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shop_chat_brand_user UNIQUE (brand_id, user_id)
);

CREATE INDEX idx_shop_chat_threads_user ON shop_chat_threads(user_id, last_message_at DESC);
CREATE INDEX idx_shop_chat_threads_brand ON shop_chat_threads(brand_id, last_message_at DESC);
CREATE INDEX idx_shop_chat_threads_status ON shop_chat_threads(status, last_message_at DESC);

CREATE TABLE shop_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES shop_chat_threads(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
    sender_role VARCHAR(16) NOT NULL
        CHECK (sender_role IN ('USER', 'BRAND', 'ADMIN', 'SYSTEM')),
    body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_chat_messages_thread ON shop_chat_messages(thread_id, created_at ASC);
