-- Plus opt-in STRICT coherence (nullable = use plan default from FitMeProperties)

ALTER TABLE user_accounts
    ADD COLUMN IF NOT EXISTS coherence_mode_override VARCHAR(20);
