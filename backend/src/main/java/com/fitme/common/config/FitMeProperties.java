package com.fitme.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "fitme")
public class FitMeProperties {
    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();
    private Upload upload = new Upload();
    private Privacy privacy = new Privacy();
    private Test test = new Test();
    private Payos payos = new Payos();
    private Ai ai = new Ai();
    private Storage storage = new Storage();

    @Data
    public static class Ai {
        private String mode = "mock";
        private String vtonBaseUrl = "http://localhost:8001";
        private String embeddingsBaseUrl = "http://localhost:8102";
        private String publicBaseUrl = "http://localhost:8080";
        private long pollIntervalMs = 3000;
        private int jobTimeoutSeconds = 120;
        private String stylistMode = "rule";
        private String geminiApiKey;
        private String geminiModel = "gemini-2.0-flash";
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
        private String returnUrl = "http://localhost:3000/brand/billing/return?status=success";
        private String cancelUrl = "http://localhost:3000/brand/billing/return?status=cancel";
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
