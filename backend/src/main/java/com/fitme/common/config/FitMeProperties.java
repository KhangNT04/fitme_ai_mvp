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
    private Commerce commerce = new Commerce();

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
    }

    @Data
    public static class Consumer {
        /** When false, all users get Plus coherence (dev escape hatch). */
        private boolean entitlementEnabled = true;
        private String freeCoherenceMode = "OFF";
        private String plusCoherenceMode = "PREFER";
        /** Multiplier on learned preference weights (Free vs Plus personalization depth). */
        private double freePreferenceScale = 1.0;
        private double plusPreferenceScale = 1.75;
    }

    @Data
    public static class Ai {
        private String mode = "mock";
        private String vtonBaseUrl = "http://localhost:8001";
        private String embeddingsBaseUrl = "http://localhost:8102";
        private String publicBaseUrl = "http://localhost:8080";
        private long pollIntervalMs = 3000;
        private int jobTimeoutSeconds = 120;
        /** How long a try-on submit keeps retrying while a sleeping VTON host boots. */
        private int vtonWakeRetrySeconds = 40;
        private String stylistMode = "rule";
        private String geminiApiKey;
        private String geminiModel = "gemini-flash-latest";
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
        private String orderReturnUrl = "http://localhost:3000/orders/return?status=success";
        private String orderCancelUrl = "http://localhost:3000/orders/return?status=cancel";
    }

    @Data
    public static class Fitken {
        /** One-time trial credits granted when a consumer wallet is first created. */
        private int trialAmount = 5;
        /** Every N consecutive daily check-ins grants {@link #checkinReward}. */
        private int checkinStreakDays = 3;
        private int checkinReward = 1;
        private int shareReward = 2;
        /** Max rewarded social-share submissions per user per day (Asia/Ho_Chi_Minh). */
        private int shareDailyLimit = 1;
        private int reviewReward = 3;
        /** Fitken spent per AI try-on generation. */
        private int tryOnCost = 1;
    }

    @Data
    public static class Commerce {
        /** Platform commission taken from each seller sub-order subtotal (0.10 = 10%). */
        private double commissionRate = 0.10;
        private long defaultShippingFeeVnd = 30000;
        /** Days after delivery before a seller sub-order becomes eligible for payout. */
        private int settlementHoldDays = 7;
        /** Minutes a PENDING_PAYMENT online order keeps its stock reservation. */
        private int paymentTimeoutMinutes = 30;
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
