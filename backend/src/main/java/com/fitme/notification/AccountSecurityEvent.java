package com.fitme.notification;

import java.time.Instant;

/**
 * A sign-in credential of an account changed. {@code email} is the sign-in email after the change;
 * {@code previousEmail} is only set for {@link Kind#EMAIL_CHANGED_BY_ADMIN}.
 */
public record AccountSecurityEvent(Kind kind, String email, String previousEmail, String displayName, Instant at) {

    public enum Kind {
        PASSWORD_CHANGED,
        PASSWORD_RESET,
        PASSWORD_SET_BY_ADMIN,
        EMAIL_CHANGED_BY_ADMIN,
        MFA_ENABLED,
        MFA_DISABLED
    }

    public static AccountSecurityEvent of(Kind kind, String email, String displayName) {
        return new AccountSecurityEvent(kind, email, null, displayName, Instant.now());
    }
}
