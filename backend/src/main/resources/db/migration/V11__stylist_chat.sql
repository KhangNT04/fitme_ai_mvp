CREATE TABLE IF NOT EXISTS stylist_conversations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stylist_conversations_user
    ON stylist_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS stylist_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES stylist_conversations (id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    type VARCHAR(40) NOT NULL,
    content TEXT NOT NULL,
    outfit_request_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stylist_messages_conversation
    ON stylist_messages (conversation_id, created_at ASC);

ALTER TABLE outfit_requests
    ADD COLUMN IF NOT EXISTS user_message TEXT;

ALTER TABLE outfit_requests
    ADD COLUMN IF NOT EXISTS conversation_id UUID;
