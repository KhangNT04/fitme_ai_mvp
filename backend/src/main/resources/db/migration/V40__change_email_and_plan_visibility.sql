-- Self-service sign-in email change + admin-controlled visibility of the consumer paid plans.

-- 1) Pending sign-in email change.
--    The account keeps the old email (and stays able to sign in with it) until the owner
--    proves they own the new address with a 6-digit code.
ALTER TABLE user_accounts
    ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS pending_email_code VARCHAR(16) NULL,
    ADD COLUMN IF NOT EXISTS pending_email_code_expires_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS pending_email_requested_at TIMESTAMPTZ NULL;

-- 2) Per-plan visibility for consumer plans.
--    `visible` = shown on the public pricing page; `active` = purchasable.
--    Hiding a plan never affects users who already bought it (their subscription keeps running).
ALTER TABLE billing_plans
    ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT TRUE;

-- 3) Global switch: hide every paid consumer plan at once (1 = show, 0 = hide).
INSERT INTO system_settings (key, value) VALUES
    ('pricing.show_paid', '1')
ON CONFLICT (key) DO NOTHING;
