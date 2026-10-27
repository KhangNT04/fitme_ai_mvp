-- Một bình luận có thể báo cho hai người: chủ bài đăng và tác giả bình luận được trả lời.
-- V41 khoá UNIQUE theo riêng comment_id nên chỉ người nhận đầu tiên nhận được thông báo.
-- Đổi sang khoá theo cặp (comment_id, recipient_id) để cả hai đều nhận.
ALTER TABLE community_comment_notifications
    DROP CONSTRAINT IF EXISTS community_comment_notifications_comment_id_key;

ALTER TABLE community_comment_notifications
    DROP CONSTRAINT IF EXISTS uq_community_comment_notification;

ALTER TABLE community_comment_notifications
    ADD CONSTRAINT uq_community_comment_notification UNIQUE (comment_id, recipient_id);
