-- Purchase confirmation on buy-click events (B2C spend tracker)

ALTER TABLE buy_click_events
    ADD COLUMN IF NOT EXISTS purchased_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE buy_click_events
    ADD COLUMN IF NOT EXISTS purchased_confirmed_at TIMESTAMP;
