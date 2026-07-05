ALTER TABLE recommendations
    ADD COLUMN IF NOT EXISTS stylist_source VARCHAR(16);

ALTER TABLE preview_generations
    ADD COLUMN IF NOT EXISTS preview_source VARCHAR(32);
