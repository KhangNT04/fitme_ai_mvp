-- Who did what to which account from the admin portal (and admin sign-ins / 2FA changes).
-- Emails are not copied here: they are read from user_accounts at display time, so erasing an account
-- also hides it from the log; erasure clears `details`, which may quote the old/new email.
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_user_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    details TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log(target_user_id, created_at DESC);

-- TOTP (RFC 6238) second factor. The secret is set while enrolling and only trusted once totp_enabled is true.
ALTER TABLE user_accounts
    ADD COLUMN totp_secret VARCHAR(64),
    ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    -- Last accepted 30-second time step: a code cannot be replayed within its validity window.
    ADD COLUMN totp_last_step BIGINT,
    -- Comma-separated SHA-256 hashes of the unused one-time recovery codes.
    ADD COLUMN totp_recovery_codes TEXT;
