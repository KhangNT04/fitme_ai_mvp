-- Cộng đồng thời trang: bài đăng công khai từ ảnh thử mặc, lưu bài, theo dõi tác giả.
-- Ảnh dùng lại từ outfit_gallery_images nên không nhân bản file trên R2.
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    gallery_image_id UUID REFERENCES outfit_gallery_images(id) ON DELETE SET NULL,
    try_on_request_id UUID,
    recommendation_id UUID,
    share_code VARCHAR(24) NOT NULL UNIQUE,
    title VARCHAR(200),
    caption TEXT,
    style_label VARCHAR(60),
    occasion VARCHAR(60),
    brand_ids TEXT,
    product_ids TEXT,
    image_url TEXT NOT NULL,
    visibility VARCHAR(16) NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'HIDDEN', 'REMOVED')),
    like_count INT NOT NULL DEFAULT 0,
    comment_count INT NOT NULL DEFAULT 0,
    view_count INT NOT NULL DEFAULT 0,
    hidden_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_community_posts_feed ON community_posts(visibility, created_at DESC);
CREATE INDEX idx_community_posts_popular ON community_posts(visibility, like_count DESC, created_at DESC);
CREATE INDEX idx_community_posts_user ON community_posts(user_id, created_at DESC);

CREATE TABLE community_post_likes (
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_community_post_likes_user ON community_post_likes(user_id, created_at DESC);

CREATE TABLE community_post_saves (
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_community_post_saves_user ON community_post_saves(user_id, created_at DESC);

CREATE TABLE community_follows (
    follower_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id)
);

CREATE INDEX idx_community_follows_followed ON community_follows(followed_id);

-- consent_records.consent_type không có CHECK constraint nên loại consent mới không cần đổi schema.
