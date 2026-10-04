-- Tokens issued before this instant are rejected, so changing or resetting a password signs out other sessions.
ALTER TABLE user_accounts ADD COLUMN password_changed_at TIMESTAMP;
