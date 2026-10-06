package com.fitme.common.enums;

public enum BillingOrderStatus {
    PENDING,
    PAID,
    /** PayOS reported a failed transaction (brand orders). A later successful webhook still marks it PAID. */
    FAILED,
    CANCELLED,
    EXPIRED
}
