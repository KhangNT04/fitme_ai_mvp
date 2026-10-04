package com.fitme.common.enums;

public enum VoucherStatus {
    AVAILABLE,
    /** Attached to an order that is not yet paid / confirmed. */
    RESERVED,
    USED,
    EXPIRED
}
