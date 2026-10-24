package com.fitme.common.enums;

public enum DeletionRequestType {
    BODY_PROFILE, STYLE_PROFILE, PHOTO_UPLOAD, WARDROBE, RECOMMENDATION_HISTORY, ALL,
    /**
     * Tự xoá tài khoản: xoá dữ liệu cá nhân và vô hiệu hoá đăng nhập sau một khoảng chờ
     * (grace period) để người dùng kịp huỷ. Không cần admin xử lý thủ công.
     */
    ACCOUNT_DELETION
}
