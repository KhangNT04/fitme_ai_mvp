-- Mỗi tài khoản có một "khoá tác giả" công khai, ngẫu nhiên và không đảo ngược.
-- Hồ sơ cộng đồng dùng khoá này thay cho user_id, nên không ai đọc được id tài khoản
-- hay email của tác giả từ URL công khai — vẫn giữ nguyên nguyên tắc ẩn danh.
--
-- gen_random_uuid() sinh một giá trị khác nhau cho từng hàng, nên câu lệnh này vừa tạo cột
-- vừa điền giá trị cho toàn bộ tài khoản đang tồn tại.
ALTER TABLE user_accounts
    ADD COLUMN IF NOT EXISTS community_author_key UUID UNIQUE DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_user_accounts_author_key
    ON user_accounts (community_author_key);
