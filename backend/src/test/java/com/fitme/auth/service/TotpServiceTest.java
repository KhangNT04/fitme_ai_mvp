package com.fitme.auth.service;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class TotpServiceTest {

    /** RFC 6238 appendix B seed for HMAC-SHA1. */
    private static final String RFC_SECRET =
            TotpService.base32Encode("12345678901234567890".getBytes(StandardCharsets.US_ASCII));

    private static TotpService at(long epochSecond) {
        return new TotpService(Clock.fixed(Instant.ofEpochSecond(epochSecond), ZoneOffset.UTC));
    }

    @Test
    void matchesRfc6238TestVectors() {
        assertThat(RFC_SECRET).isEqualTo("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
        // The RFC lists 8-digit codes; authenticator apps show the last 6 digits.
        assertThat(at(59).codeAt(RFC_SECRET, 59 / 30)).isEqualTo("287082");
        assertThat(at(0).codeAt(RFC_SECRET, 1111111109L / 30)).isEqualTo("081804");
        assertThat(at(0).codeAt(RFC_SECRET, 2000000000L / 30)).isEqualTo("279037");
    }

    @Test
    void acceptsOneStepOfClockDriftAndRejectsReplays() {
        TotpService totp = at(1_700_000_000L);
        long now = totp.currentStep();
        String current = totp.codeAt(RFC_SECRET, now);

        assertThat(totp.matchingStep(RFC_SECRET, current, null)).hasValue(now);
        assertThat(totp.matchingStep(RFC_SECRET, current.substring(0, 3) + " " + current.substring(3), null))
                .hasValue(now);
        assertThat(totp.matchingStep(RFC_SECRET, totp.codeAt(RFC_SECRET, now - 1), null)).hasValue(now - 1);
        assertThat(totp.matchingStep(RFC_SECRET, totp.codeAt(RFC_SECRET, now + 1), null)).hasValue(now + 1);
        assertThat(totp.matchingStep(RFC_SECRET, totp.codeAt(RFC_SECRET, now - 2), null)).isEmpty();

        assertThat(totp.matchingStep(RFC_SECRET, current, now)).isEmpty();
        assertThat(totp.matchingStep(RFC_SECRET, "12345", null)).isEmpty();
        assertThat(totp.matchingStep(RFC_SECRET, "abcdef", null)).isEmpty();
        assertThat(totp.matchingStep(null, current, null)).isEmpty();
    }

    @Test
    void secretsRoundTripThroughBase32AndRecoveryCodesNormalize() {
        TotpService totp = new TotpService();
        String secret = totp.newSecret();
        assertThat(secret).hasSize(32).matches("[A-Z2-7]+");
        assertThat(TotpService.base32Encode(TotpService.base32Decode(secret.toLowerCase()))).isEqualTo(secret);

        String code = totp.newRecoveryCodes(1).get(0);
        assertThat(code).matches("[a-z2-9]{5}-[a-z2-9]{5}");
        assertThat(TotpService.hashRecoveryCode(" " + code.toUpperCase().replace("-", "") + " "))
                .isEqualTo(TotpService.hashRecoveryCode(code));
        assertThat(totp.otpauthUri("FitMe AI", "admin@fitme.ai", secret))
                .startsWith("otpauth://totp/FitMe%20AI:admin%40fitme.ai?secret=" + secret)
                .contains("issuer=FitMe%20AI");
    }
}
