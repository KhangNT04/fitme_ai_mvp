ALTER TABLE try_on_requests
    ADD COLUMN IF NOT EXISTS preview_mode VARCHAR(30) DEFAULT 'OUTFIT_BOARD_ONLY',
    ADD COLUMN IF NOT EXISTS avatar_key VARCHAR(50);

UPDATE try_on_requests SET preview_mode = 'OUTFIT_BOARD_ONLY' WHERE preview_mode IS NULL;
