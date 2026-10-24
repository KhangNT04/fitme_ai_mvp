package com.fitme.auth.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/** State of the self-service sign-in email change for the signed-in account. */
@Data
@Builder
public class EmailChangeStatusDto {
    /** The address the owner asked to switch to; null when no change is pending. */
    private String pendingEmail;
    /** When the pending change was requested; null when nothing is pending. */
    private Instant requestedAt;
    /** When the verification code expires; null when nothing is pending. */
    private Instant expiresAt;
    /** True while a code is pending confirmation. */
    private boolean pending;
}
