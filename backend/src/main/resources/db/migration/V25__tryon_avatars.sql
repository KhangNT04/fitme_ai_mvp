-- Sample models for "Dùng avatar mẫu" try-on, managed by admins.
-- avatar_key is what try_on_requests.avatar_key stores; image_url is a /catalog/... frontend asset,
-- an /uploads/... stored file, or an absolute URL.
CREATE TABLE tryon_avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    avatar_key VARCHAR(64) NOT NULL UNIQUE,
    label VARCHAR(80) NOT NULL,
    image_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tryon_avatars_active_order ON tryon_avatars(active, display_order);

INSERT INTO tryon_avatars (avatar_key, label, image_url, display_order) VALUES
    ('avatar-male-1', 'Nam 1', '/catalog/tryon-avatars/avatar-male-1.jpg', 1),
    ('avatar-male-2', 'Nam 2', '/catalog/tryon-avatars/avatar-male-2.jpg', 2),
    ('avatar-female-1', 'Nữ 1', '/catalog/tryon-avatars/avatar-female-1.jpg', 3);
