package com.fitme.rewards.service;

import com.fitme.common.config.FitMeProperties;
import com.fitme.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Validates and canonicalizes public post links submitted for the share reward.
 *
 * <p>Two kinds of link are accepted:
 * <ul>
 *   <li>a social post (Facebook, TikTok, Instagram, Threads, X) — the classic flow;</li>
 *   <li>a FitMe community permalink ({@code /outfit/<shareCode>}) — so a user can claim the
 *       reward for the post they just published without leaving the app.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class ShareUrlPolicy {

    /** Platform recorded for a link that points at a FitMe community post. */
    public static final String PLATFORM_FITME = "FITME";
    /** Path prefix of a public community permalink, e.g. {@code /outfit/a1b2c3d4}. */
    public static final String COMMUNITY_PATH_PREFIX = "/outfit/";

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

    private final FitMeProperties properties;

    public record SharePost(String canonicalUrl, String platform, String shareCode) {

        /** A social post link — no community post behind it. */
        public SharePost(String canonicalUrl, String platform) {
            this(canonicalUrl, platform, null);
        }
    }

    public static List<String> allowedDomains() {
        return List.copyOf(DOMAIN_PLATFORMS.keySet());
    }

    public SharePost validate(String rawUrl) {
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
        String path = uri.getRawPath() == null ? "" : uri.getRawPath();
        while (path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        if (path.isEmpty()) {
            throw new BusinessException("Link cần trỏ tới một bài đăng cụ thể, không phải trang chủ", "SHARE_INVALID_URL");
        }

        // A community permalink on one of our own hosts is rewarded as a FitMe share.
        SharePost community = validateCommunityLink(host, path);
        if (community != null) {
            return community;
        }

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
        String canonicalHost = host.equals(matchedDomain) ? host : canonicalSubdomain(host, matchedDomain);
        String query = cleanQuery(uri.getRawQuery());
        String canonical = "https://" + canonicalHost + path + (query.isEmpty() ? "" : "?" + query);
        return new SharePost(canonical, platform);
    }

    /**
     * Matches a community permalink hosted on one of our own domains.
     *
     * @return the canonical share post, or null when the link points somewhere else
     */
    private SharePost validateCommunityLink(String host, String path) {
        if (!path.startsWith(COMMUNITY_PATH_PREFIX)) {
            return null;
        }
        String shareCode = path.substring(COMMUNITY_PATH_PREFIX.length());
        if (shareCode.isEmpty() || shareCode.contains("/")) {
            return null;
        }
        if (!isOwnHost(host)) {
            throw invalid();
        }
        return new SharePost("https://" + host + COMMUNITY_PATH_PREFIX + shareCode, PLATFORM_FITME, shareCode);
    }

    /** True when the host is the configured frontend or the public API host. */
    private boolean isOwnHost(String host) {
        for (String candidate : ownHosts()) {
            String normalized = hostOf(candidate);
            if (normalized == null || normalized.isEmpty()) {
                continue;
            }
            if (host.equals(normalized) || host.endsWith("." + normalized)) {
                return true;
            }
        }
        return false;
    }

    /** Extracts the lower-case host of a configured base URL, which may or may not carry a scheme. */
    private static String hostOf(String candidate) {
        if (candidate == null || candidate.isBlank()) {
            return null;
        }
        String trimmed = candidate.trim();
        try {
            URI uri = new URI(trimmed.contains("://") ? trimmed : "https://" + trimmed);
            if (uri.getHost() != null) {
                return uri.getHost().toLowerCase(Locale.ROOT);
            }
        } catch (URISyntaxException ignored) {
            // Fall through to the plain-string handling below.
        }
        String plain = trimmed.toLowerCase(Locale.ROOT);
        int scheme = plain.indexOf("://");
        if (scheme >= 0) {
            plain = plain.substring(scheme + 3);
        }
        int slash = plain.indexOf('/');
        if (slash >= 0) {
            plain = plain.substring(0, slash);
        }
        int colon = plain.indexOf(':');
        if (colon >= 0) {
            plain = plain.substring(0, colon);
        }
        return plain;
    }

    private List<String> ownHosts() {
        return List.of(
                properties.getFrontend().getBaseUrl(),
                properties.getCommunity().getShareBaseUrlHost());
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
                "Link không hợp lệ. Hãy dán link bài đăng công khai trên Facebook, TikTok, Instagram, Threads, X, "
                        + "hoặc link bài chia sẻ của bạn trên FitMe.",
                "SHARE_INVALID_URL");
    }
}
