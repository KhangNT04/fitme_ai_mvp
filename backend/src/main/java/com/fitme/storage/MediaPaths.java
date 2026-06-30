package com.fitme.storage;

import java.nio.file.Paths;
import java.util.UUID;

public final class MediaPaths {

    private MediaPaths() {
    }

    public static String sanitizeFilename(String original) {
        if (original == null || original.isBlank()) {
            return UUID.randomUUID().toString();
        }
        String base = Paths.get(original).getFileName().toString();
        String cleaned = base.replaceAll("[^a-zA-Z0-9._-]", "_");
        return cleaned.isBlank() ? UUID.randomUUID().toString() : cleaned;
    }

    public static String buildStoredPath(String folder, String filename) {
        return "/uploads/" + folder + "/" + filename;
    }
}
