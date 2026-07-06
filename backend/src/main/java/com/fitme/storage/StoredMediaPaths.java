package com.fitme.storage;

public final class StoredMediaPaths {

    private StoredMediaPaths() {
    }

    /** Normalize DB values (relative path or legacy R2 URL) to `/uploads/...` form. */
    public static String normalizeToUploadPath(String storedPathOrUrl) {
        if (storedPathOrUrl == null || storedPathOrUrl.isBlank()) {
            return storedPathOrUrl;
        }
        String value = storedPathOrUrl.trim();
        if (value.startsWith("/uploads/")) {
            return value;
        }
        if (value.startsWith("http://") || value.startsWith("https://")) {
            String key = R2StorageService.extractObjectKey(value, null);
            if (key != null && !key.isBlank()) {
                return "/uploads/" + (key.startsWith("/") ? key.substring(1) : key);
            }
        }
        if (value.startsWith("/")) {
            return value;
        }
        return "/uploads/" + value;
    }
}
