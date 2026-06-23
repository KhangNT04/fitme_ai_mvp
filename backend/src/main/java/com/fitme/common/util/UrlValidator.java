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
                    && (uri.getScheme().equals("http") || uri.getScheme().equals("https"));
        } catch (Exception e) {
            return false;
        }
    }
}
