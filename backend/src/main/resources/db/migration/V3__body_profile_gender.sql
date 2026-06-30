ALTER TABLE body_profiles
    ADD COLUMN gender VARCHAR(50);

UPDATE body_profiles SET gender = 'OTHER' WHERE gender IS NULL;

ALTER TABLE body_profiles
    ALTER COLUMN gender SET NOT NULL,
    ALTER COLUMN gender SET DEFAULT 'OTHER';
