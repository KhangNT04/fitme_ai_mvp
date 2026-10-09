package com.fitme.common.util;

import java.net.URI;

public final class UrlValidator {

    private UrlValidator() {
    }

    public static boolean isValidHttpUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String trimmed = url.trim().toLowerCase();
        if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) {
            return false;
        }
        try {
            URI uri = URI.create(url.trim());
            return uri.getScheme() != null
                    && (uri.getScheme().equals("http") || uri.getScheme().equals("https"))
                    && uri.getHost() != null && uri.getHost().contains(".");
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Image links: absolute http(s) URLs, or the relative {@code /uploads/...} / {@code /catalog/...} paths
     * FitMe stores for its own uploads and catalog media.
     */
    public static boolean isValidImageUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String trimmed = url.trim();
        if (trimmed.startsWith("/uploads/") || trimmed.startsWith("/catalog/")) {
            return !trimmed.contains("..") && !trimmed.contains("\\");
        }
        try {
            URI uri = URI.create(trimmed);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
            return (scheme.equals("http") || scheme.equals("https"))
                    && uri.getHost() != null && !uri.getHost().isBlank();
        } catch (Exception e) {
            return false;
        }
    }
}
