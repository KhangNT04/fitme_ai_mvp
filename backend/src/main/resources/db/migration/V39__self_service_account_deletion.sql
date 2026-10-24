-- Tự xoá tài khoản: người dùng yêu cầu xoá, có thể huỷ trong thời gian chờ (grace period),
-- sau đó hệ thống tự ẩn danh hoá + vô hiệu hoá tài khoản mà không cần admin xử lý.

-- TIMESTAMPTZ (không phải TIMESTAMP) để so sánh với now() của database không lệch múi giờ.
ALTER TABLE data_deletion_requests
    ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Yêu cầu tự xoá tài khoản đang chờ: dùng để chặn tạo trùng và để job quét xử lý.
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_pending_account
    ON data_deletion_requests(user_id, grace_period_ends_at)
    WHERE request_type = 'ACCOUNT_DELETION' AND status = 'PENDING';

-- Một tài khoản chỉ được có một yêu cầu tự xoá đang chờ tại một thời điểm.
CREATE UNIQUE INDEX IF NOT EXISTS uq_data_deletion_requests_pending_account
    ON data_deletion_requests(user_id)
    WHERE request_type = 'ACCOUNT_DELETION' AND status = 'PENDING';
