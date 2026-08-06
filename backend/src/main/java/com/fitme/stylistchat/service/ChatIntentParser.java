package com.fitme.stylistchat.service;

import com.fitme.recommendation.service.UserStylingContextService;
import com.fitme.userprofile.entity.BodyProfile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
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
        String text = ChatIntentLexicon.normalize(message);
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
        for (ChatIntentLexicon.IntentEntry entry : ChatIntentLexicon.ENTRIES) {
            if (entry.occasion() != null && entry.matches(text)) {
                return entry.occasion();
            }
        }
        return ChatIntentLexicon.OCCASION_DEFAULT;
    }

    private static String detectVibe(String text) {
        for (ChatIntentLexicon.IntentEntry entry : ChatIntentLexicon.ENTRIES) {
            if (entry.vibe() != null && entry.matches(text)) {
                return entry.vibe();
            }
        }
        return null;
    }

    private static List<String> detectStyles(String text) {
        Set<String> styles = new LinkedHashSet<>();
        for (ChatIntentLexicon.IntentEntry entry : ChatIntentLexicon.ENTRIES) {
            if (!entry.styles().isEmpty() && entry.matches(text)) {
                styles.addAll(entry.styles());
            }
        }
        // Cap at 4 options
        return new ArrayList<>(styles).stream().limit(4).toList();
    }
}
