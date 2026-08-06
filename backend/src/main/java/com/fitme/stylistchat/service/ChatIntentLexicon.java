package com.fitme.stylistchat.service;

import java.util.List;
import java.util.Locale;

/**
 * Single source of truth mapping chat keywords to occasion / vibe / style slots.
 *
 * <p>Previously occasion, vibe and style each had their own independent keyword list inside
 * {@link ChatIntentParser}. Some words (e.g. "thanh lịch") were wired into the vibe and style
 * lists but not the occasion list, so a message like "mình muốn phong cách thanh lịch" produced
 * mismatched slots: vibe = Thanh lịch, style = Office Chic, but occasion fell back to the generic
 * "Casual hàng ngày" default. Downstream, {@code StylistChatService.toDisplayStyleLabel} then
 * showed "Đi làm" purely from a hardcoded style fallback — a label that didn't match the occasion
 * actually sent to the recommendation engine.
 *
 * <p>Keeping every keyword group in one table (with occasion + vibe + styles defined together)
 * means a synonym only needs to be added/edited in one place, and the three slots it implies stay
 * consistent with each other by construction.
 */
final class ChatIntentLexicon {

    private ChatIntentLexicon() {
    }

    static final String OCCASION_WORK = "Đi làm";
    static final String OCCASION_DATE = "Hẹn hò";
    static final String OCCASION_CAFE = "Đi cafe";
    static final String OCCASION_TRAVEL = "Du lịch";
    static final String OCCASION_GYM = "Tập gym";
    static final String OCCASION_DEFAULT = "Casual hàng ngày";

    static final String VIBE_ELEGANT = "Thanh lịch";
    static final String VIBE_RELAXED = "Thoải mái";
    static final String VIBE_BOLD = "Nổi bật";

    static final String STYLE_STREETWEAR = "Streetwear";
    static final String STYLE_MINIMAL = "Minimal";
    static final String STYLE_KOREAN = "Korean Casual";
    static final String STYLE_OFFICE = "Office Chic";
    static final String STYLE_ROMANTIC = "Romantic";
    static final String STYLE_SPORTY = "Sporty";
    static final String STYLE_VINTAGE = "Vintage";
    static final String STYLE_ARTISTIC = "Artistic";

    record IntentEntry(List<String> keywords, String occasion, String vibe, List<String> styles) {

        boolean matches(String text) {
            for (String keyword : keywords) {
                if (text.contains(keyword)) {
                    return true;
                }
            }
            return false;
        }
    }

    /**
     * Order matters: occasion/vibe detection returns the first matching entry (with a non-null
     * value for that slot) in list order, and style detection collects styles from every matching
     * entry. This preserves the original per-slot priority (office > date > cafe > travel > gym for
     * occasion; elegant > relaxed > bold for vibe; streetwear > minimal > korean > office > romantic
     * > sporty > vintage > artistic for style) while keeping shared keywords (like "thanh lịch") in
     * a single row.
     */
    static final List<IntentEntry> ENTRIES = List.of(
            new IntentEntry(
                    List.of("street", "đường phố", "nghệ sĩ", "hoodie", "sneaker"),
                    null, null, List.of(STYLE_STREETWEAR)),
            new IntentEntry(
                    List.of("minimal", "basic", "tối giản", "chill"),
                    null, null, List.of(STYLE_MINIMAL)),
            new IntentEntry(
                    List.of("korean", "hàn", "seoul"),
                    null, null, List.of(STYLE_KOREAN)),
            new IntentEntry(
                    List.of("đi làm", "văn phòng", "office", "công sở", "blazer", "thanh lịch"),
                    OCCASION_WORK, VIBE_ELEGANT, List.of(STYLE_OFFICE)),
            new IntentEntry(
                    List.of("gọn", "formal"),
                    null, VIBE_ELEGANT, List.of()),
            new IntentEntry(
                    List.of("hẹn hò", "buổi tối", "date", "dự tiệc", "tiệc"),
                    OCCASION_DATE, null, List.of()),
            new IntentEntry(
                    List.of("romantic", "nữ tính", "hẹn hò"),
                    null, null, List.of(STYLE_ROMANTIC)),
            new IntentEntry(
                    List.of("cafe", "cà phê", "cuối tuần", "weekend"),
                    OCCASION_CAFE, null, List.of()),
            new IntentEntry(
                    List.of("du lịch", "travel", "đi chơi"),
                    OCCASION_TRAVEL, null, List.of()),
            new IntentEntry(
                    List.of("năng động", "thoải mái", "chill"),
                    null, VIBE_RELAXED, List.of()),
            new IntentEntry(
                    List.of("gym", "tập", "thể thao", "sport", "năng động"),
                    OCCASION_GYM, null, List.of(STYLE_SPORTY)),
            new IntentEntry(
                    List.of("vintage", "retro"),
                    null, null, List.of(STYLE_VINTAGE)),
            new IntentEntry(
                    List.of("artistic", "nghệ thuật"),
                    null, null, List.of(STYLE_ARTISTIC)),
            new IntentEntry(
                    List.of("nổi bật", "tự tin", "cá tính"),
                    null, VIBE_BOLD, List.of())
    );

    static String normalize(String message) {
        return message == null ? "" : message.toLowerCase(Locale.ROOT);
    }
}
