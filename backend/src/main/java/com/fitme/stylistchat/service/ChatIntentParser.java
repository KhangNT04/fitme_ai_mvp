package com.fitme.stylistchat.service;

import com.fitme.recommendation.service.UserStylingContextService;
import com.fitme.userprofile.entity.BodyProfile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class ChatIntentParser {

    private final UserStylingContextService userStylingContextService;

    public ChatIntentParser(UserStylingContextService userStylingContextService) {
        this.userStylingContextService = userStylingContextService;
    }

    public record ChatIntent(String occasion, String desiredVibe, List<String> styleLabels, String summary) {
    }

    public ChatIntent parse(String message) {
        return parse(message, null);
    }

    public ChatIntent parse(String message, BodyProfile body) {
        String text = message == null ? "" : message.toLowerCase(Locale.ROOT);
        String occasion = detectOccasion(text);
        String vibe = detectVibe(text);
        List<String> detected = detectStyles(text);
        List<String> styles = userStylingContextService.harmonizeStylesWithProfile(body, message, detected);
        String summary = message != null && message.length() > 180
                ? message.substring(0, 180) + "…"
                : message;
        return new ChatIntent(occasion, vibe, styles, summary);
    }

    private static String detectOccasion(String text) {
        if (containsAny(text, "đi làm", "văn phòng", "office", "công sở")) {
            return "Đi làm";
        }
        if (containsAny(text, "hẹn hò", "buổi tối", "date", "dự tiệc", "tiệc")) {
            return "Hẹn hò";
        }
        if (containsAny(text, "cafe", "cà phê", "cuối tuần", "weekend")) {
            return "Đi cafe";
        }
        if (containsAny(text, "du lịch", "travel", "đi chơi")) {
            return "Du lịch";
        }
        if (containsAny(text, "gym", "tập", "thể thao", "sport")) {
            return "Tập gym";
        }
        return "Casual hàng ngày";
    }

    private static String detectVibe(String text) {
        if (containsAny(text, "thanh lịch", "gọn", "formal")) {
            return "Thanh lịch";
        }
        if (containsAny(text, "năng động", "thoải mái", "chill")) {
            return "Thoải mái";
        }
        if (containsAny(text, "nổi bật", "tự tin", "cá tính")) {
            return "Nổi bật";
        }
        return null;
    }

    private static List<String> detectStyles(String text) {
        Set<String> styles = new LinkedHashSet<>();
        if (containsAny(text, "street", "đường phố", "nghệ sĩ", "hoodie", "sneaker")) {
            styles.add("Streetwear");
        }
        if (containsAny(text, "minimal", "basic", "tối giản", "chill")) {
            styles.add("Minimal");
        }
        if (containsAny(text, "korean", "hàn", "seoul")) {
            styles.add("Korean Casual");
        }
        if (containsAny(text, "office", "văn phòng", "đi làm", "blazer", "thanh lịch")) {
            styles.add("Office Chic");
        }
        if (containsAny(text, "romantic", "nữ tính", "hẹn hò")) {
            styles.add("Romantic");
        }
        if (containsAny(text, "sport", "gym", "năng động")) {
            styles.add("Sporty");
        }
        if (containsAny(text, "vintage", "retro")) {
            styles.add("Vintage");
        }
        if (containsAny(text, "artistic", "nghệ thuật")) {
            styles.add("Artistic");
        }
        // Cap at 4 options
        return new ArrayList<>(styles).stream().limit(4).toList();
    }

    private static boolean containsAny(String text, String... needles) {
        for (String n : needles) {
            if (text.contains(n)) {
                return true;
            }
        }
        return false;
    }
}
