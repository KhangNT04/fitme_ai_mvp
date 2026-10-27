-- Bình luận cho bài đăng cộng đồng: giống mạng xã hội, có trả lời 1 cấp.
-- parent_id trỏ tới bình luận cha; reply cấp 2 không được phép nên chỉ cho phép 1 cấp.
CREATE TABLE community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    -- Bình luận cha đã bị xoá -> reply vẫn còn nhưng gắn với chỗ trống.
    parent_author_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (length(trim(content)) > 0)
);

CREATE INDEX idx_community_comments_post ON community_comments(post_id, created_at);
CREATE INDEX idx_community_comments_parent ON community_comments(parent_id, created_at);
CREATE INDEX idx_community_comments_user ON community_comments(user_id, created_at DESC);

-- comment_count được duy trì bằng trigger nên entity save không ghi đè số đếm khi có bình luận chạy song song.
CREATE OR REPLACE FUNCTION sync_community_comment_count() RETURNS TRIGGER AS $$
DECLARE
    target_post UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        target_post := NEW.post_id;
        UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = target_post;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        target_post := OLD.post_id;
        UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = target_post;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_community_comments_count
    AFTER INSERT OR DELETE ON community_comments
    FOR EACH ROW EXECUTE FUNCTION sync_community_comment_count();

-- Bình luận mới tới bài của ai đó -> ghi nhận để gửi thông báo. Tách bảng khỏi community_comments
-- để việc gửi mail (ngoài transaction) không khóa bảng bình luận.
CREATE TABLE community_comment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    -- Một bình luận có thể báo cho hai người (chủ bài và tác giả bình luận được trả lời),
    -- nên khoá theo cặp (bình luận, người nhận) chứ không theo riêng bình luận.
    CONSTRAINT uq_community_comment_notification UNIQUE (comment_id, recipient_id)
);

CREATE INDEX idx_community_comment_notifications_pending
    ON community_comment_notifications(delivered_at) WHERE delivered_at IS NULL;
CREATE INDEX idx_community_comment_notifications_recipient
    ON community_comment_notifications(recipient_id, created_at DESC);
