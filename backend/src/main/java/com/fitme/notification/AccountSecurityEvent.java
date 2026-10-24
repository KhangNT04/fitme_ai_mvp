package com.fitme.notification;

import java.time.Instant;

/**
 * A sign-in credential of an account changed. {@code email} is the sign-in email after the change;
 * {@code previousEmail} is set for the email-change kinds ({@link Kind#EMAIL_CHANGED_BY_ADMIN},
 * {@link Kind#EMAIL_CHANGED_BY_USER}).
 */
public record AccountSecurityEvent(Kind kind, String email, String previousEmail, String displayName, Instant at) {

    public enum Kind {
        PASSWORD_CHANGED,
        PASSWORD_RESET,
        PASSWORD_SET_BY_ADMIN,
        EMAIL_CHANGED_BY_ADMIN,
        MFA_ENABLED,
        MFA_DISABLED,
        /** The owner asked to delete their own account; the mail confirms it is scheduled and can be cancelled. */
        ACCOUNT_DELETION_SCHEDULED,
        /** The owner cancelled a scheduled self-service deletion. */
        ACCOUNT_DELETION_CANCELLED,
        /** The owner changed the sign-in email themselves after confirming the new address. */
        EMAIL_CHANGED_BY_USER
    }

    public static AccountSecurityEvent of(Kind kind, String email, String displayName) {
        return new AccountSecurityEvent(kind, email, null, displayName, Instant.now());
    }
}
