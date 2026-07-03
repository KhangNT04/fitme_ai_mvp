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

    @Data
    public static class Ai {
        private String mode = "mock";
        private String vtonBaseUrl = "http://localhost:8101";
        private String embeddingsBaseUrl = "http://localhost:8102";
        private long pollIntervalMs = 3000;
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
}
