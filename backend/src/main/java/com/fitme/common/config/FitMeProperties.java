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
