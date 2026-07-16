package com.fitme.stylistchat.service;

import com.fitme.ai.client.GeminiStylistClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class TopicGuardService {

    public static final String OFF_TOPIC_REPLY =
            "Mình là stylist FitMe — chỉ hỗ trợ tư vấn trang phục và phối đồ. Bạn muốn phối outfit cho dịp nào?";

    private static final Pattern FASHION_HINT = Pattern.compile(
            "(?i)(áo|quần|váy|đầm|giày|phối|outfit|style|streetwear|minimal|office|"
                    + "mặc|size|form|màu|cafe|cà phê|đi làm|văn phòng|hẹn hò|du lịch|"
                    + "gym|thể thao|thời trang|tủ đồ|blazer|hoodie|sneaker|boots|"
                    + "casual|chic|romantic|vintage|sporty|korean|phong cách|"
                    + "set đồ|combo|look|stylist|try.?on|thử mặc)");

    private static final Pattern OFF_TOPIC_HINT = Pattern.compile(
            "(?i)(code|lập trình|javascript|python|toán|giải phương trình|"
                    + "chính trị|bầu cử|y tế|bệnh|thuốc|chứng khoán|crypto|"
                    + "nấu ăn|công thức|hack|malware|vũ khí)");

    private final GeminiStylistClient geminiStylistClient;

    public boolean isOnTopic(String message, List<String> recentUserMessages) {
        if (message == null || message.isBlank()) {
            return false;
        }
        String text = message.trim();
        if (OFF_TOPIC_HINT.matcher(text).find() && !FASHION_HINT.matcher(text).find()) {
            return false;
        }
        if (FASHION_HINT.matcher(text).find()) {
            return true;
        }
        // Short follow-ups in an active fashion thread
        if (recentUserMessages != null && !recentUserMessages.isEmpty()
                && recentUserMessages.stream().anyMatch(m -> m != null && FASHION_HINT.matcher(m).find())
                && text.length() <= 120) {
            return true;
        }
        return geminiStylistClient.classifyFashionTopic(text).orElse(false);
    }

    public String normalizeForIntent(String message) {
        return message == null ? "" : message.trim().toLowerCase(Locale.ROOT);
    }
}
