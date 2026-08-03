-- Brand partnerships, consumer Free/Plus entitlement, preference flywheel weights

ALTER TABLE user_accounts
    ADD COLUMN IF NOT EXISTS consumer_plan VARCHAR(20) NOT NULL DEFAULT 'FREE';

CREATE TABLE IF NOT EXISTS brand_partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_a_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    brand_b_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT brand_partnerships_ordered CHECK (brand_a_id < brand_b_id),
    CONSTRAINT brand_partnerships_unique UNIQUE (brand_a_id, brand_b_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_partnerships_a ON brand_partnerships(brand_a_id);
CREATE INDEX IF NOT EXISTS idx_brand_partnerships_b ON brand_partnerships(brand_b_id);

CREATE TABLE IF NOT EXISTS user_preference_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
    session_id UUID REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
    weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT user_preference_weights_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_preference_weights_user
    ON user_preference_weights(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_preference_weights_session
    ON user_preference_weights(session_id) WHERE session_id IS NOT NULL AND user_id IS NULL;
