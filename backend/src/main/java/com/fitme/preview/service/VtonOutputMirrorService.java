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

        byte[] bytes = RestClient.create()
                .get()
                .uri(trimmed)
                .retrieve()
                .body(byte[].class);
        if (bytes == null || bytes.length == 0) {
            throw new IOException("Empty VTON output from " + trimmed);
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
