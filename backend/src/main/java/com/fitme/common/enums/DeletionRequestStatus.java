package com.fitme.common.enums;

public enum DeletionRequestStatus {
    PENDING, PROCESSING, COMPLETED, FAILED,
    /** Người dùng huỷ yêu cầu trong grace period (chỉ dùng cho ACCOUNT_DELETION). */
    CANCELLED
}
