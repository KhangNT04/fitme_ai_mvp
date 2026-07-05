package com.fitme.storage;

import com.fitme.common.config.FitMeProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MediaUrlResolver {

    private final FitMeProperties properties;

    public String resolvePublicUrl(String storedPathOrUrl) {
        if (storedPathOrUrl == null || storedPathOrUrl.isBlank()) {
            return storedPathOrUrl;
        }
        String value = storedPathOrUrl.trim();
        if (value.startsWith("http://") || value.startsWith("https://")) {
            return value;
        }
        if ("r2".equalsIgnoreCase(properties.getStorage().getMode())) {
            String r2Base = properties.getStorage().getR2().getPublicBaseUrl();
            if (r2Base != null && !r2Base.isBlank()) {
                String base = r2Base.endsWith("/") ? r2Base.substring(0, r2Base.length() - 1) : r2Base;
                String relative = value.startsWith("/uploads/") ? value.substring("/uploads/".length()) : value;
                if (relative.startsWith("/")) {
                    relative = relative.substring(1);
                }
                return base + "/" + relative;
            }
        }
        String base = properties.getAi().getPublicBaseUrl();
        if (base == null || base.isBlank()) {
            base = "http://localhost:8080";
        }
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (value.startsWith("/")) {
            return base + value;
        }
        return base + "/" + value;
    }
}
