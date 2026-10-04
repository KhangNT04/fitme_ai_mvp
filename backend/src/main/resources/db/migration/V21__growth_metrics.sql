-- One row per user per local (Asia/Ho_Chi_Minh) day with at least one authenticated request: DAU/WAU/MAU, retention.
CREATE TABLE user_activity_days (
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX idx_user_activity_days_date ON user_activity_days(activity_date);

-- Best-effort history: days on which a user produced analytics events or signed up.
INSERT INTO user_activity_days (user_id, activity_date)
SELECT DISTINCT e.user_id, (e.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
FROM analytics_events e
JOIN user_accounts u ON u.id = e.user_id
WHERE e.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO user_activity_days (user_id, activity_date)
SELECT u.id, (u.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
FROM user_accounts u
ON CONFLICT DO NOTHING;

-- First-touch acquisition channel captured at signup (utm_* query params / document.referrer).
ALTER TABLE user_accounts ADD COLUMN signup_source VARCHAR(100);
ALTER TABLE user_accounts ADD COLUMN signup_medium VARCHAR(100);
ALTER TABLE user_accounts ADD COLUMN signup_campaign VARCHAR(150);
ALTER TABLE user_accounts ADD COLUMN signup_referrer VARCHAR(255);

CREATE INDEX idx_user_accounts_created ON user_accounts(created_at);

-- "Was this review helpful?" votes.
CREATE TABLE review_helpful_votes (
    review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (review_id, user_id)
);

ALTER TABLE product_reviews ADD COLUMN helpful_count INT NOT NULL DEFAULT 0;

CREATE INDEX idx_analytics_events_type_created ON analytics_events(event_type, created_at);
CREATE INDEX idx_try_on_requests_created ON try_on_requests(created_at);
CREATE INDEX idx_orders_paid_at ON orders(paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX idx_consumer_billing_orders_paid_at ON consumer_billing_orders(paid_at) WHERE paid_at IS NOT NULL;
