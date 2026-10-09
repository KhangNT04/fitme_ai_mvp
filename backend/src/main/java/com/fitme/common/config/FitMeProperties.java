package com.fitme.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "fitme")
public class FitMeProperties {
    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();
    private Frontend frontend = new Frontend();
    private Upload upload = new Upload();
    private Privacy privacy = new Privacy();
    private Test test = new Test();
    private Payos payos = new Payos();
    private Ai ai = new Ai();
    private Storage storage = new Storage();
    private Consumer consumer = new Consumer();
    private Auth auth = new Auth();
    private Fitken fitken = new Fitken();

    @Data
    public static class Auth {
        /**
         * When true, register/resend API may include verificationCode (tests/CI only).
         * Production must keep false and send codes via email.
         */
        private boolean exposeVerificationCode = false;
        /** Minimum form fill time in ms before register is accepted (anti-bot). */
        private long minFormMs = 2000;
        /** Email verification code TTL in seconds. */
        private long verificationTtlSeconds = 1800;
        /** From address for auth emails (Resend / SMTP). */
        private String mailFrom = "noreply@fitme.ai";
        /**
         * Resend API key (HTTPS). Prefer this on Render — outbound SMTP :587 is often blocked.
         * When blank, AuthEmailService also accepts spring.mail.password values starting with re_.
         */
        private String resendApiKey = "";
        /**
         * HTTPS endpoint that sends mail from the FitMe Gmail account: the frontend's /api/mail-relay on Vercel
         * or the Apps Script in deploy/gmail-relay. Takes precedence over Resend/SMTP; Render Free blocks SMTP ports.
         */
        private String mailRelayUrl = "";
        /** Shared secret checked by the relay script (RELAY_SECRET script property). */
        private String mailRelaySecret = "";
    }

    @Data
    public static class Consumer {
        /** When false, every user gets Premium features (dev escape hatch). */
        private boolean entitlementEnabled = true;
        private String freeCoherenceMode = "OFF";
        private String premiumCoherenceMode = "PREFER";
        /** Multiplier on learned preference weights (Free vs Premium personalization depth). */
        private double freePreferenceScale = 1.0;
        private double premiumPreferenceScale = 1.75;
    }

    @Data
    public static class Ai {
        private String mode = "mock";
        private String vtonBaseUrl = "http://localhost:8001";
        /** Shared secret sent as X-Internal-Token to ai-vton (which enforces it when VTON_INTERNAL_TOKEN is set). */
        private String vtonInternalToken;
        private String embeddingsBaseUrl = "http://localhost:8102";
        private String publicBaseUrl = "http://localhost:8080";
        private long pollIntervalMs = 3000;
        private int jobTimeoutSeconds = 120;
        /** How long a try-on submit keeps retrying while a sleeping VTON host boots. */
        private int vtonWakeRetrySeconds = 40;
        private String stylistMode = "rule";
        private String geminiApiKey;
        private String geminiModel = "gemini-flash-latest";
        /** Used when the primary model is overloaded (HTTP 503/429); blank disables the fallback. */
        private String geminiFallbackModel = "gemini-flash-lite-latest";
        private int stylistCandidateLimit = 30;
        private int stylistTimeoutMs = 15000;

        public boolean isGeminiStylistEnabled() {
            return "gemini".equalsIgnoreCase(stylistMode)
                    && geminiApiKey != null
                    && !geminiApiKey.isBlank();
        }
    }

    @Data
    public static class Payos {
        private boolean mock = true;
        private String clientId;
        private String apiKey;
        private String checksumKey;
        private String subscriptionReturnUrl = "http://localhost:3000/billing/return?status=success";
        private String subscriptionCancelUrl = "http://localhost:3000/billing/return?status=cancel";
        /** Brand Plus return/cancel pages; blank = /brand/plan/return on the subscription return URL's origin. */
        private String brandPlusReturnUrl = "";
        private String brandPlusCancelUrl = "";
    }

    @Data
    public static class Fitken {
        /** One-time trial credits granted when a consumer wallet is first created. */
        private int trialAmount = 5;
        /** Every N consecutive daily check-ins grants {@link #checkinReward}. */
        private int checkinStreakDays = 3;
        private int checkinReward = 1;
        private int shareReward = 3;
        /** Max rewarded social-share submissions per user per day (Asia/Ho_Chi_Minh). */
        private int shareDailyLimit = 1;
        private int reviewReward = 2;
        /** Max rewarded photo reviews per user per day (Asia/Ho_Chi_Minh); later reviews that day earn nothing. */
        private int reviewDailyLimit = 1;
        /** Fitken spent per AI try-on generation. */
        private int tryOnCost = 1;
    }

    @Data
    public static class Test {
        private boolean exposeResetTokens = false;
    }

    @Data
    public static class Jwt {
        private String secret;
        private long accessExpiration;
        private long refreshExpiration;
    }

    @Data
    public static class Cors {
        private String origins;
    }

    @Data
    public static class Frontend {
        private String baseUrl;
    }

    @Data
    public static class Upload {
        private String dir;
    }

    @Data
    public static class Privacy {
        private String version;
    }

    @Data
    public static class Storage {
        private String mode = "local";
        private R2 r2 = new R2();

        @Data
        public static class R2 {
            private String endpoint;
            private String bucket;
            private String accessKeyId;
            private String secretAccessKey;
            private String publicBaseUrl;
        }
    }
}
