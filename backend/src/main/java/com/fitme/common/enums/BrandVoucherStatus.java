package com.fitme.common.enums;

/**
 * ISSUED -> RESERVED (checkout) -> USED (paid) or back to ISSUED / EXPIRED (order cancelled, failed or expired).
 * ISSUED -> REVOKED (admin) or EXPIRED (past expires_at).
 */
public enum BrandVoucherStatus {
    ISSUED,
    RESERVED,
    USED,
    REVOKED,
    EXPIRED
}
