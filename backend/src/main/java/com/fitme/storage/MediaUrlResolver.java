package com.fitme.storage;

import com.fitme.common.config.FitMeProperties;
import com.fitme.storage.StoredMediaPaths;
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
        String value = StoredMediaPaths.normalizeToUploadPath(storedPathOrUrl);
        if (value.startsWith("http://") || value.startsWith("https://")) {
            return value;
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
