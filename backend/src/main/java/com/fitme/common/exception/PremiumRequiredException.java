package com.fitme.common.exception;

/** A FitMe Premium feature was used by a Free (or anonymous) consumer; surfaced as HTTP 403 PREMIUM_REQUIRED. */
public class PremiumRequiredException extends RuntimeException {

    public static final String CODE = "PREMIUM_REQUIRED";

    public PremiumRequiredException(String message) {
        super(message);
    }
}
