ALTER TABLE user_accounts
    ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(16);

ALTER TABLE user_accounts
    ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;
