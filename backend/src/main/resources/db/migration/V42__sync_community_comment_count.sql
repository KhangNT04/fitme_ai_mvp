-- Đồng bộ comment_count với số dòng bình luận thật.
--
-- V41 thêm trigger cộng/trừ 1 mỗi khi thêm/xoá bình luận, nhưng các bài đăng demo đã được seed
-- từ trước với comment_count ghi cứng theo dataset. Trigger chỉ cộng thêm nên số đếm lệch với
-- số bình luận thật — feed hiện "17 bình luận" trong khi thread chỉ có 11 dòng.
--
-- Sửa ở đây thay vì sửa tay trên production: chạy idempotent, chỉ chạm những bài đang lệch.
UPDATE community_posts p
SET comment_count = (
    SELECT COUNT(*)::int FROM community_comments c WHERE c.post_id = p.id
)
WHERE p.comment_count <> (
    SELECT COUNT(*)::int FROM community_comments c WHERE c.post_id = p.id
);
