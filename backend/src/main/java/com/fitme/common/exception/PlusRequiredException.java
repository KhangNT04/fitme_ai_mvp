package com.fitme.common.exception;

/** A FitMe Brand Plus feature was used by a brand without an active Plus period; surfaced as HTTP 403 PLUS_REQUIRED. */
public class PlusRequiredException extends RuntimeException {

    public static final String CODE = "PLUS_REQUIRED";

    public PlusRequiredException(String message) {
        super(message);
    }
}
