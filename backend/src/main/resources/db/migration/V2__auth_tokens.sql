-- Refresh token revocations (persist across restarts)

CREATE TABLE refresh_token_revocations (
    token_hash VARCHAR(64) PRIMARY KEY,
    revoked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_token_revocations_revoked_at ON refresh_token_revocations(revoked_at);
