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
        String trimmed = storedPathOrUrl.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        String value = StoredMediaPaths.normalizeToUploadPath(trimmed);
        if (value.startsWith("/catalog/")) {
            return joinBase(resolveFrontendBaseUrl(), value);
        }
        if (value.startsWith("/uploads/") && isR2Mode()) {
            String r2Base = properties.getStorage().getR2().getPublicBaseUrl();
            if (r2Base != null && !r2Base.isBlank()) {
                String objectKey = R2StorageService.extractObjectKey(value, null);
                return R2StorageService.buildPublicUrl(r2Base, objectKey);
            }
        }
        return joinBase(resolveBackendBaseUrl(), value);
    }

    /**
     * URL handed to ai-vton (and from there, FASHN/HF) to fetch a user's own uploaded photo.
     * Prefers the direct R2 public URL when {@code fitme.storage.mode=r2} and
     * {@code R2_PUBLIC_BASE_URL} is configured — that's a genuinely public internet URL, so
     * FASHN can fetch it without depending on {@code FITME_PUBLIC_BASE_URL} being reachable
     * from the outside (handy for local dev, where it's usually {@code http://localhost:8080}).
     * Falls back to {@link #resolveBackendServedUrl} otherwise (local disk storage, or R2
     * configured without a public base URL — {@code /uploads/**} always works there since the
     * backend proxies the read using its own R2 credentials regardless of bucket ACL).
     */
    public String resolveVtonFetchableUrl(String storedPathOrUrl) {
        if (isR2Mode()) {
            String r2Base = properties.getStorage().getR2().getPublicBaseUrl();
            if (r2Base != null && !r2Base.isBlank()) {
                return resolvePublicUrl(storedPathOrUrl);
            }
        }
        return resolveBackendServedUrl(storedPathOrUrl);
    }

    /**
     * URL for external AI services (ai-vton) to fetch user uploads via this backend.
     * R2 public URLs may 404 when the bucket is private; {@code /uploads/**} is always served here.
     */
    public String resolveBackendServedUrl(String storedPathOrUrl) {
        if (storedPathOrUrl == null || storedPathOrUrl.isBlank()) {
            return storedPathOrUrl;
        }
        String trimmed = storedPathOrUrl.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            String normalized = StoredMediaPaths.normalizeToUploadPath(trimmed);
            if (normalized.startsWith("/uploads/")) {
                return joinBase(resolveBackendBaseUrl(), normalized);
            }
            return trimmed;
        }
        String value = StoredMediaPaths.normalizeToUploadPath(trimmed);
        return joinBase(resolveBackendBaseUrl(), value);
    }

    private boolean isR2Mode() {
        String mode = properties.getStorage().getMode();
        return mode != null && "r2".equalsIgnoreCase(mode.trim());
    }

    private String resolveBackendBaseUrl() {
        String base = properties.getAi().getPublicBaseUrl();
        if (base == null || base.isBlank()) {
            base = "http://localhost:8080";
        }
        return stripTrailingSlash(base);
    }

    private String resolveFrontendBaseUrl() {
        String frontend = properties.getFrontend().getBaseUrl();
        if (frontend != null && !frontend.isBlank()) {
            return stripTrailingSlash(frontend);
        }
        String cors = properties.getCors().getOrigins();
        if (cors != null && !cors.isBlank()) {
            String first = cors.split(",")[0].trim();
            if (!first.isBlank()) {
                return stripTrailingSlash(first);
            }
        }
        return resolveBackendBaseUrl();
    }

    private static String joinBase(String base, String path) {
        if (path.startsWith("/")) {
            return base + path;
        }
        return base + "/" + path;
    }

    private static String stripTrailingSlash(String base) {
        if (base.endsWith("/")) {
            return base.substring(0, base.length() - 1);
        }
        return base;
    }
}
