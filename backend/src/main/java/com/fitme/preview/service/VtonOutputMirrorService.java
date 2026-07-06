package com.fitme.preview.service;

import com.fitme.storage.MediaUrlResolver;
import com.fitme.storage.StorageService;
import com.fitme.storage.StoredMediaPaths;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VtonOutputMirrorService {

    private static final String FOLDER = "vton-results";
    private static final int MAX_MIRROR_ATTEMPTS = 3;

    private final StorageService storageService;
    private final MediaUrlResolver mediaUrlResolver;

    public String persistRemoteOutput(String sourceUrl, UUID previewId) throws IOException {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            return sourceUrl;
        }
        String trimmed = sourceUrl.trim();
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            return mediaUrlResolver.resolveBackendServedUrl(trimmed);
        }
        if (isAlreadyPersisted(trimmed)) {
            return mediaUrlResolver.resolveBackendServedUrl(StoredMediaPaths.normalizeToUploadPath(trimmed));
        }
        if (!isEphemeralVtonOutputUrl(trimmed)) {
            return trimmed;
        }

        IOException lastError = null;
        for (int attempt = 1; attempt <= MAX_MIRROR_ATTEMPTS; attempt++) {
            try {
                return mirrorOnce(trimmed, previewId);
            } catch (IOException ex) {
                lastError = ex;
                log.warn("Mirror attempt {}/{} failed for preview {}: {}",
                        attempt, MAX_MIRROR_ATTEMPTS, previewId, ex.getMessage());
                if (attempt < MAX_MIRROR_ATTEMPTS) {
                    try {
                        Thread.sleep(500L * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw ex;
                    }
                }
            }
        }
        throw lastError != null ? lastError : new IOException("Failed to mirror VTON output");
    }

    /** True for ephemeral ai-vton URLs that are lost on service redeploy. */
    public static boolean isEphemeralVtonOutputUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String trimmed = url.trim().toLowerCase(Locale.ROOT);
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            return false;
        }
        try {
            String path = java.net.URI.create(url.trim()).getPath();
            return path != null && path.toLowerCase(Locale.ROOT).contains("/outputs/");
        } catch (IllegalArgumentException ex) {
            return trimmed.contains("/outputs/");
        }
    }

    private String mirrorOnce(String sourceUrl, UUID previewId) throws IOException {
        byte[] bytes = RestClient.create()
                .get()
                .uri(sourceUrl)
                .retrieve()
                .body(byte[].class);
        if (bytes == null || bytes.length == 0) {
            throw new IOException("Empty VTON output from " + sourceUrl);
        }

        String filename = previewId + ".jpg";
        String storedPath = storageService.storeBytes(FOLDER, filename, bytes, "image/jpeg");
        String publicUrl = mediaUrlResolver.resolveBackendServedUrl(storedPath);
        log.info("Mirrored VTON output for preview {} to {}", previewId, publicUrl);
        return publicUrl;
    }

    private static boolean isAlreadyPersisted(String url) {
        String path = StoredMediaPaths.normalizeToUploadPath(url);
        if (path.toLowerCase(Locale.ROOT).startsWith("/uploads/" + FOLDER + "/")) {
            return true;
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            try {
                String pathname = java.net.URI.create(url).getPath();
                return pathname != null
                        && pathname.toLowerCase(Locale.ROOT).startsWith("/uploads/" + FOLDER + "/");
            } catch (IllegalArgumentException ignored) {
                return false;
            }
        }
        return false;
    }
}
