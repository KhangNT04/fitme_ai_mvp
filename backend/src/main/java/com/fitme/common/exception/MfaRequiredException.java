package com.fitme.common.exception;

/** The admin portal needs a session that signed in with a TOTP code; surfaced as HTTP 403 ADMIN_MFA_REQUIRED. */
public class MfaRequiredException extends RuntimeException {

    public static final String CODE = "ADMIN_MFA_REQUIRED";

    public MfaRequiredException(String message) {
        super(message);
    }
}
