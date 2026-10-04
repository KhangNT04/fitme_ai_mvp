package com.fitme.rewards.service;

import com.fitme.common.exception.BusinessException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Validates and canonicalizes public social post links submitted for the share reward. */
public final class ShareUrlPolicy {

    private static final Map<String, String> DOMAIN_PLATFORMS = new LinkedHashMap<>();

    static {
        DOMAIN_PLATFORMS.put("facebook.com", "FACEBOOK");
        DOMAIN_PLATFORMS.put("fb.watch", "FACEBOOK");
        DOMAIN_PLATFORMS.put("tiktok.com", "TIKTOK");
        DOMAIN_PLATFORMS.put("instagram.com", "INSTAGRAM");
        DOMAIN_PLATFORMS.put("threads.net", "THREADS");
        DOMAIN_PLATFORMS.put("x.com", "X");
        DOMAIN_PLATFORMS.put("twitter.com", "X");
    }

    private static final Set<String> TRACKING_PARAMS = Set.of(
            "fbclid", "igsh", "igshid", "si", "_r", "_t", "mibextid", "is_from_webapp", "sender_device", "rdid");

    public record SharePost(String canonicalUrl, String platform) {}

    private ShareUrlPolicy() {
    }

    public static List<String> allowedDomains() {
        return List.copyOf(DOMAIN_PLATFORMS.keySet());
    }

    public static SharePost validate(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw invalid();
        }
        URI uri;
        try {
            uri = new URI(rawUrl.trim());
        } catch (URISyntaxException ex) {
            throw invalid();
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) {
            throw invalid();
        }
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        String platform = null;
        String matchedDomain = null;
        for (Map.Entry<String, String> entry : DOMAIN_PLATFORMS.entrySet()) {
            String domain = entry.getKey();
            if (host.equals(domain) || host.endsWith("." + domain)) {
                platform = entry.getValue();
                matchedDomain = domain;
                break;
            }
        }
        if (platform == null) {
            throw invalid();
        }
        String path = uri.getRawPath() == null ? "" : uri.getRawPath();
        while (path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        if (path.isEmpty()) {
            throw new BusinessException("Link cần trỏ tới một bài đăng cụ thể, không phải trang chủ", "SHARE_INVALID_URL");
        }
        String canonicalHost = host.equals(matchedDomain) ? host : canonicalSubdomain(host, matchedDomain);
        String query = cleanQuery(uri.getRawQuery());
        String canonical = "https://" + canonicalHost + path + (query.isEmpty() ? "" : "?" + query);
        return new SharePost(canonical, platform);
    }

    private static String canonicalSubdomain(String host, String domain) {
        String sub = host.substring(0, host.length() - domain.length() - 1);
        return switch (sub) {
            case "www", "m", "mobile", "web", "touch" -> domain;
            default -> host;
        };
    }

    private static String cleanQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) {
            return "";
        }
        return Arrays.stream(rawQuery.split("&"))
                .filter(part -> !part.isBlank())
                .filter(part -> {
                    String key = part.split("=", 2)[0].toLowerCase(Locale.ROOT);
                    return !key.startsWith("utm_") && !TRACKING_PARAMS.contains(key);
                })
                .sorted()
                .collect(Collectors.joining("&"));
    }

    private static BusinessException invalid() {
        return new BusinessException(
                "Link không hợp lệ. Hãy dán link https bài đăng công khai trên Facebook, TikTok, Instagram, Threads hoặc X.",
                "SHARE_INVALID_URL");
    }
}
