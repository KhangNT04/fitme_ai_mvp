package com.fitme.common.config;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.storage.CatalogMediaMirror;
import com.fitme.storage.CatalogMediaMirrorRepository;
import com.fitme.storage.MediaUrlResolver;
import com.fitme.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Copies catalog images (product photos, brand logos) from their source CDN into FitMe storage
 * (R2 on prod, local disk in dev) and points catalog rows at the copies. Idempotent: one row per
 * source URL in {@code catalog_media_mirror}; failed downloads keep the source URL and are retried
 * on the next run.
 */
@Service
public class CatalogMediaService {

    private static final Logger log = LoggerFactory.getLogger(CatalogMediaService.class);
    static final String FOLDER = "catalog-media";
    private static final int MAX_BYTES = 10 * 1024 * 1024;
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    private final CatalogMediaMirrorRepository mirrorRepository;
    private final StorageService storageService;
    private final MediaUrlResolver mediaUrlResolver;
    private final ProductImageRepository imageRepository;
    private final BrandRepository brandRepository;
    private final HttpClient httpClient;

    public CatalogMediaService(
            CatalogMediaMirrorRepository mirrorRepository,
            StorageService storageService,
            MediaUrlResolver mediaUrlResolver,
            ProductImageRepository imageRepository,
            BrandRepository brandRepository) {
        this.mirrorRepository = mirrorRepository;
        this.storageService = storageService;
        this.mediaUrlResolver = mediaUrlResolver;
        this.imageRepository = imageRepository;
        this.brandRepository = brandRepository;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public record MirrorReport(int pending, int mirrored, int failed) {
    }

    public record RewriteReport(int images, int logos) {
    }

    /** URL to persist for a catalog source image: the FitMe copy once mirrored, else the source itself. */
    public String resolve(String sourceUrl) {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            return sourceUrl;
        }
        return mirrorRepository.findBySourceUrl(sourceUrl.trim())
                .map(CatalogMediaMirror::servedUrl)
                .orElse(sourceUrl);
    }

    /** True when {@code storedUrl} (as saved on a product image) refers to {@code sourceUrl} or its FitMe copy. */
    public boolean refersTo(String storedUrl, String sourceUrl) {
        if (storedUrl == null || sourceUrl == null) {
            return false;
        }
        if (storedUrl.equals(sourceUrl)) {
            return true;
        }
        return mirrorRepository.findBySourceUrl(sourceUrl.trim())
                .map(m -> storedUrl.equals(m.getStoredPath()) || storedUrl.equals(m.getPublicUrl()))
                .orElse(false);
    }

    /** Downloads every source not yet mirrored, with bounded concurrency. Call {@link #rewriteReferences()} after. */
    public MirrorReport mirrorPending(Collection<String> sourceUrls, int concurrency) {
        Set<String> known = mirrorRepository.findAll().stream()
                .map(CatalogMediaMirror::getSourceUrl)
                .collect(Collectors.toSet());
        List<String> pending = sourceUrls.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(CatalogMediaService::isRemoteSource)
                .filter(url -> !known.contains(url))
                .distinct()
                .toList();

        AtomicInteger mirrored = new AtomicInteger();
        AtomicInteger failed = new AtomicInteger();
        if (!pending.isEmpty()) {
            log.info("Catalog media: mirroring {} images into FitMe storage", pending.size());
            Boolean directReachable = null;
            Iterator<String> it = pending.iterator();
            // The first copy decides whether the public bucket URL works; later copies reuse the answer.
            while (directReachable == null && it.hasNext()) {
                String first = it.next();
                Optional<CatalogMediaMirror> row = mirrorOne(first, null);
                if (row.isPresent()) {
                    mirrored.incrementAndGet();
                    directReachable = row.get().getPublicUrl() != null;
                } else {
                    failed.incrementAndGet();
                }
            }
            List<String> rest = new ArrayList<>();
            it.forEachRemaining(rest::add);
            if (!rest.isEmpty()) {
                boolean useDirect = Boolean.TRUE.equals(directReachable);
                ExecutorService pool = Executors.newFixedThreadPool(Math.max(1, concurrency));
                try {
                    List<Future<Optional<CatalogMediaMirror>>> futures = rest.stream()
                            .map(url -> pool.submit(() -> mirrorOne(url, useDirect)))
                            .toList();
                    for (Future<Optional<CatalogMediaMirror>> future : futures) {
                        try {
                            if (future.get().isPresent()) {
                                mirrored.incrementAndGet();
                            } else {
                                failed.incrementAndGet();
                            }
                        } catch (Exception e) {
                            failed.incrementAndGet();
                        }
                    }
                } finally {
                    pool.shutdown();
                    try {
                        pool.awaitTermination(1, TimeUnit.MINUTES);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        }

        return new MirrorReport(pending.size(), mirrored.get(), failed.get());
    }

    /**
     * @param useDirect null = probe whether the direct public URL is reachable; otherwise reuse that decision
     */
    Optional<CatalogMediaMirror> mirrorOne(String sourceUrl, Boolean useDirect) {
        try {
            HttpResponse<byte[]> response = httpClient.send(
                    HttpRequest.newBuilder(URI.create(sourceUrl))
                            .timeout(REQUEST_TIMEOUT)
                            .header("User-Agent", "FitMe-CatalogMirror/1.0")
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.ofByteArray());
            byte[] bytes = response.body();
            String contentType = response.headers().firstValue("Content-Type").orElse("image/jpeg");
            if (response.statusCode() != 200 || bytes == null || bytes.length == 0) {
                throw new IOException("HTTP " + response.statusCode());
            }
            if (!contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
                throw new IOException("Not an image: " + contentType);
            }
            if (bytes.length > MAX_BYTES) {
                throw new IOException("Image too large: " + bytes.length + " bytes");
            }
            String mime = contentType.split(";")[0].trim().toLowerCase(Locale.ROOT);
            String storedPath = storageService.storeBytes(FOLDER, objectName(sourceUrl, mime), bytes, mime);
            String publicUrl = mediaUrlResolver.directPublicUrl(storedPath)
                    .filter(url -> useDirect != null ? useDirect : isReachable(url))
                    .orElse(null);
            CatalogMediaMirror row = CatalogMediaMirror.builder()
                    .sourceUrl(sourceUrl)
                    .storedPath(storedPath)
                    .publicUrl(publicUrl)
                    .contentType(mime)
                    .sizeBytes((long) bytes.length)
                    .build();
            try {
                return Optional.of(mirrorRepository.save(row));
            } catch (DataIntegrityViolationException duplicate) {
                return mirrorRepository.findBySourceUrl(sourceUrl);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Catalog media: could not mirror {} ({}); keeping source URL until next run",
                    sourceUrl, e.getMessage());
            return Optional.empty();
        }
    }

    private boolean isReachable(String url) {
        try {
            HttpResponse<Void> response = httpClient.send(
                    HttpRequest.newBuilder(URI.create(url)).timeout(REQUEST_TIMEOUT).GET().build(),
                    HttpResponse.BodyHandlers.discarding());
            boolean ok = response.statusCode() == 200;
            if (!ok) {
                log.warn("Catalog media: public URL {} returned HTTP {}; serving copies via backend /uploads",
                        url, response.statusCode());
            }
            return ok;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.warn("Catalog media: public URL {} unreachable ({}); serving copies via backend /uploads",
                    url, e.getMessage());
            return false;
        }
    }

    /** Repoints product images and brand logos that still reference a mirrored source URL. */
    @Transactional
    public RewriteReport rewriteReferences() {
        Map<String, String> served = mirrorRepository.findAll().stream()
                .collect(Collectors.toMap(CatalogMediaMirror::getSourceUrl, CatalogMediaMirror::servedUrl,
                        (a, b) -> a));
        int images = 0;
        for (String url : imageRepository.findDistinctAbsoluteImageUrls()) {
            String target = served.get(url);
            if (target != null && !target.equals(url)) {
                images += imageRepository.replaceImageUrl(url, target);
            }
        }
        int logos = 0;
        for (Brand brand : brandRepository.findAll()) {
            String target = brand.getLogoUrl() != null ? served.get(brand.getLogoUrl().trim()) : null;
            if (target != null && !target.equals(brand.getLogoUrl())) {
                brand.setLogoUrl(target);
                brandRepository.save(brand);
                logos++;
            }
        }
        if (images > 0 || logos > 0) {
            log.info("Catalog media: repointed {} product images and {} brand logos to FitMe storage", images, logos);
        }
        return new RewriteReport(images, logos);
    }

    static boolean isRemoteSource(String url) {
        if (url.startsWith("https://") || url.startsWith("http://")) {
            return !url.contains("/" + FOLDER + "/") && !url.contains("/uploads/");
        }
        return false;
    }

    /** Stable object name: the CDN file id when it is a safe token (Shopee hashes), else a hash of the URL. */
    static String objectName(String sourceUrl, String mime) {
        String extension = switch (mime) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".jpg";
        };
        String path = URI.create(sourceUrl).getPath();
        String last = path != null && path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : "";
        String stem = last.contains(".") ? last.substring(0, last.lastIndexOf('.')) : last;
        if (!stem.matches("[A-Za-z0-9_-]{8,120}")) {
            stem = sha256Hex(sourceUrl).substring(0, 32);
        }
        return stem + extension;
    }

    private static String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
