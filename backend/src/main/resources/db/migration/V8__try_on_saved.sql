ALTER TABLE try_on_requests
    ADD COLUMN IF NOT EXISTS saved BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_try_on_requests_user_saved ON try_on_requests (user_id, saved) WHERE saved = TRUE;
CREATE INDEX IF NOT EXISTS idx_try_on_requests_session_saved ON try_on_requests (session_id, saved) WHERE saved = TRUE;
