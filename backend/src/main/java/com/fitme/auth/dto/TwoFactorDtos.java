package com.fitme.auth.dto;

import java.util.List;

public final class TwoFactorDtos {

    private TwoFactorDtos() {
    }

    /**
     * @param available        the account may enroll (admins only for now)
     * @param required         the admin portal refuses this account's sessions without 2FA
     * @param sessionVerified  the current session signed in with a code
     */
    public record Status(boolean enabled, boolean available, boolean required, boolean sessionVerified,
                         int recoveryCodesRemaining) {
    }

    /** Shown once while enrolling; {@code otpauthUri} is rendered as a QR code by the frontend. */
    public record Setup(String secret, String otpauthUri) {
    }

    /** {@code session} carries fresh tokens marked as 2FA-verified for the caller. */
    public record Enabled(List<String> recoveryCodes, AuthResponse session) {
    }

    public record RecoveryCodes(List<String> recoveryCodes) {
    }
}
