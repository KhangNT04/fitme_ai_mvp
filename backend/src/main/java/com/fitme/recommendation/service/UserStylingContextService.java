package com.fitme.recommendation.service;

import com.fitme.recommendation.StyleOptionCatalog;
import com.fitme.userprofile.entity.BodyProfile;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Aligns style/product choices with the full user profile (age, goals, chat intent).
 * Youth-forward looks are suppressed for mature users unless explicitly requested in chat.
 */
@Service
public class UserStylingContextService {

    private static final Set<String> YOUTH_FORWARD_STYLES = Set.of(
            "Streetwear", "Korean Casual", "Sporty", "Artistic"
    );

    private static final List<String> MATURE_DEFAULT_STYLES = List.of(
            "Minimal", "Office Chic", "Vintage", "Romantic"
    );

    private static final List<String> YOUNG_DEFAULT_STYLES = List.of(
            "Korean Casual", "Streetwear", "Minimal", "Sporty"
    );

    private static final List<String> BALANCED_DEFAULT_STYLES = List.of(
            "Minimal", "Office Chic", "Korean Casual", "Streetwear"
    );

    public enum AgeBand {
        YOUNG, ADULT, MATURE, SENIOR, UNKNOWN
    }

    public record StylingGuidance(
            AgeBand ageBand,
            Integer age,
            boolean youthfulLookRequested,
            List<String> preferredStyles,
            List<String> avoidUnlessRequested,
            String summaryVi) {
    }

    public AgeBand resolveAgeBand(BodyProfile body) {
        if (body == null || body.getAge() == null) {
            return AgeBand.UNKNOWN;
        }
        int age = body.getAge();
        if (age < 30) {
            return AgeBand.YOUNG;
        }
        if (age < 45) {
            return AgeBand.ADULT;
        }
        if (age < 55) {
            return AgeBand.MATURE;
        }
        return AgeBand.SENIOR;
    }

    public boolean isYouthfulLookRequested(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return false;
        }
        String text = userMessage.toLowerCase(Locale.ROOT);
        return containsAny(text,
                "trẻ trung", "trẻ hơn", "gen z", "genz", "youth", "hype",
                "streetwear", "street", "hoodie", "sneaker", "cá tính",
                "nổi bật", "trendy", "hip", "đường phố", "nghệ sĩ",
                "oversize", "oversized", "crop top", "y2k", "k-pop", "kpop");
    }

    public StylingGuidance buildGuidance(BodyProfile body, String userMessage, List<String> requestedStyles) {
        AgeBand band = resolveAgeBand(body);
        Integer age = body != null ? body.getAge() : null;
        boolean youthfulRequested = isYouthfulLookRequested(userMessage)
                || explicitlyRequestsYouthStyle(requestedStyles);

        List<String> preferred = suggestDefaultStyles(body, userMessage, requestedStyles);
        List<String> avoid = youthfulRequested || band == AgeBand.YOUNG
                ? List.of()
                : YOUTH_FORWARD_STYLES.stream().toList();

        String summary = buildSummaryVi(body, band, youthfulRequested, preferred, avoid);
        return new StylingGuidance(band, age, youthfulRequested, preferred, avoid, summary);
    }

    public List<String> suggestDefaultStyles(BodyProfile body, String userMessage, List<String> messageStyles) {
        if (messageStyles != null && !messageStyles.isEmpty()) {
            return harmonizeStylesWithProfile(body, userMessage, messageStyles);
        }
        AgeBand band = resolveAgeBand(body);
        boolean youthful = isYouthfulLookRequested(userMessage);
        return switch (band) {
            case YOUNG -> YOUNG_DEFAULT_STYLES;
            case ADULT -> youthful ? YOUNG_DEFAULT_STYLES : BALANCED_DEFAULT_STYLES;
            case MATURE, SENIOR -> youthful
                    ? List.of("Minimal", "Office Chic", "Streetwear", "Vintage")
                    : MATURE_DEFAULT_STYLES;
            case UNKNOWN -> StyleOptionCatalog.DEFAULT_STYLES;
        };
    }

    public List<String> harmonizeStylesWithProfile(
            BodyProfile body,
            String userMessage,
            List<String> stylesFromMessage) {
        if (stylesFromMessage == null || stylesFromMessage.isEmpty()) {
            return suggestDefaultStyles(body, userMessage, List.of());
        }
        AgeBand band = resolveAgeBand(body);
        boolean youthful = isYouthfulLookRequested(userMessage);
        if (band == AgeBand.YOUNG || youthful || band == AgeBand.UNKNOWN) {
            return capDistinct(stylesFromMessage);
        }

        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (String style : stylesFromMessage) {
            if (style == null || style.isBlank()) {
                continue;
            }
            if (YOUTH_FORWARD_STYLES.contains(style) && isMatureBand(band)) {
                // User named a youth style explicitly in chat — keep one such option max.
                if (result.stream().noneMatch(YOUTH_FORWARD_STYLES::contains)) {
                    result.add(style);
                }
                continue;
            }
            result.add(style);
        }
        if (result.isEmpty()) {
            return suggestDefaultStyles(body, userMessage, List.of());
        }
        while (result.size() < 3) {
            for (String fallback : MATURE_DEFAULT_STYLES) {
                if (result.add(fallback) && result.size() >= 3) {
                    break;
                }
            }
            break;
        }
        return capDistinct(new ArrayList<>(result));
    }

    /**
     * Age-aware product scoring bonus/penalty using tags, name and category heuristics.
     */
    public double scoreAgeAlignment(
            BodyProfile body,
            String userMessage,
            String targetStyle,
            List<String> productTags,
            String productName,
            String category) {
        if (body == null || body.getAge() == null) {
            return 0;
        }
        AgeBand band = resolveAgeBand(body);
        boolean youthful = isYouthfulLookRequested(userMessage);
        if (band == AgeBand.YOUNG || youthful) {
            return scoreYouthfulProductSignals(productTags, productName, category, targetStyle);
        }

        String blob = joinBlob(productTags, productName, category);
        double score = 0;
        if (containsAny(blob,
                "blazer", "linen", "wool", "tailored", "classic", "elegant",
                "structured", "office", "formal", "minimal", "vintage", "chinos")) {
            score += 8;
        }
        if (isMatureBand(band) && containsAny(blob,
                "crop", "y2k", "graphic tee", "hoodie", "oversize", "oversized",
                "street", "chunky sneaker", "university", "teen", "cargo jogger", "bucket hat")) {
            score -= 18;
        }
        if (isMatureBand(band) && targetStyle != null && YOUTH_FORWARD_STYLES.contains(targetStyle)) {
            score -= 6;
        }
        if (isMatureBand(band) && containsAny(blob, "minimal", "office", "linen", "classic")) {
            score += 5;
        }
        return score;
    }

    private double scoreYouthfulProductSignals(
            List<String> productTags,
            String productName,
            String category,
            String targetStyle) {
        String blob = joinBlob(productTags, productName, category);
        double score = 0;
        if (targetStyle != null && YOUTH_FORWARD_STYLES.contains(targetStyle)) {
            score += 4;
        }
        if (containsAny(blob, "street", "hoodie", "sneaker", "oversize", "graphic", "cargo")) {
            score += 4;
        }
        return score;
    }

    private static boolean explicitlyRequestsYouthStyle(List<String> requestedStyles) {
        if (requestedStyles == null) {
            return false;
        }
        return requestedStyles.stream().anyMatch(s -> s != null && YOUTH_FORWARD_STYLES.contains(s));
    }

    private static boolean isMatureBand(AgeBand band) {
        return band == AgeBand.MATURE || band == AgeBand.SENIOR;
    }

    private static List<String> capDistinct(List<String> styles) {
        return styles.stream()
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .limit(4)
                .toList();
    }

    private static String joinBlob(List<String> tags, String name, String category) {
        StringBuilder sb = new StringBuilder();
        if (name != null) {
            sb.append(name.toLowerCase(Locale.ROOT)).append(' ');
        }
        if (category != null) {
            sb.append(category.toLowerCase(Locale.ROOT)).append(' ');
        }
        if (tags != null) {
            for (String tag : tags) {
                if (tag != null) {
                    sb.append(tag.toLowerCase(Locale.ROOT)).append(' ');
                }
            }
        }
        return sb.toString();
    }

    private static boolean containsAny(String text, String... needles) {
        if (text == null || text.isBlank()) {
            return false;
        }
        for (String needle : needles) {
            if (text.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private String buildSummaryVi(
            BodyProfile body,
            AgeBand band,
            boolean youthfulRequested,
            List<String> preferred,
            List<String> avoid) {
        StringBuilder sb = new StringBuilder();
        if (body != null && body.getAge() != null) {
            sb.append("Khách ").append(body.getAge()).append(" tuổi");
        } else {
            sb.append("Khách (chưa có tuổi)");
        }
        sb.append(" — nhóm ").append(band.name()).append(". ");
        if (youthfulRequested) {
            sb.append("Khách muốn look trẻ trung/năng động trong tin nhắn. ");
        } else if (isMatureBand(band)) {
            sb.append("Ưu tiên outfit trưởng thành, gọn, thanh lịch; tránh set quá teen trừ khi khách yêu cầu. ");
        }
        sb.append("Phong cách ưu tiên: ").append(String.join(", ", preferred)).append(". ");
        if (!avoid.isEmpty()) {
            sb.append("Hạn chế (trừ khi khách yêu cầu): ").append(String.join(", ", avoid)).append(". ");
        }
        if (body != null && body.getGoals() != null && !body.getGoals().isEmpty()) {
            sb.append("Mục tiêu: ").append(formatGoals(body.getGoals())).append(". ");
        }
        if (body != null && body.getFitPreference() != null) {
            sb.append("Gu mặc: ").append(body.getFitPreference().name()).append(". ");
        }
        return sb.toString().trim();
    }

    @SuppressWarnings("unchecked")
    private static String formatGoals(Map<String, Object> goals) {
        Object items = goals.get("items");
        if (items instanceof List<?> list) {
            return list.stream().map(String::valueOf).reduce((a, b) -> a + ", " + b).orElse("");
        }
        return goals.toString();
    }
}
