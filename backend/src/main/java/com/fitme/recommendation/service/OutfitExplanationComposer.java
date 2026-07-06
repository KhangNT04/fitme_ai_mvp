package com.fitme.recommendation.service;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.Gender;
import com.fitme.common.enums.SkinTone;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class OutfitExplanationComposer {

    public String composeForCustomer(
            BodyProfile body,
            StyleProfile style,
            String occasion,
            String desiredVibe,
            String recommendedSize,
            String alternativeSize,
            String recommendedForm,
            String recommendedColor,
            int wardrobeCount,
            String title) {
        List<String> sentences = new ArrayList<>();

        sentences.add(openingSentence(body, title));
        sentences.add(genderFitSentence(body));
        sentences.add(sizeSentence(recommendedSize, alternativeSize, recommendedForm, body.getFitPreference()));
        sentences.add(styleSentence(style, desiredVibe));
        sentences.add(occasionSentence(occasion));
        sentences.add(colorSentence(recommendedColor, body.getSkinTone(), style));
        if (wardrobeCount > 0) {
            sentences.add(wardrobeSentence(wardrobeCount));
        }
        sentences.add("Bạn thử set này trước nhé — cần đổi món hay chỉnh size cứ nói em hỗ trợ tiếp.");

        return sentences.stream()
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining(" "));
    }

    public String resolveSummary(Recommendation rec) {
        if (isStoredNarrative(rec)) {
            return appendWardrobe(rec.getExplanationBody(), rec.getExplanationWardrobe());
        }
        return composeFromRecommendation(rec);
    }

    private String composeFromRecommendation(Recommendation rec) {
        List<String> sentences = new ArrayList<>();

        if (rec.getRecommendedSize() != null && rec.getRecommendedForm() != null) {
            sentences.add(String.format(
                    Locale.forLanguageTag("vi"),
                    "Em gợi ý size %s với form %s — vừa vặn mà vẫn thoải mái cả ngày.",
                    rec.getRecommendedSize(),
                    rec.getRecommendedForm()));
        } else if (hasText(rec.getExplanationBody())) {
            sentences.add(cleanFragment(rec.getExplanationBody()));
        }

        if (hasText(rec.getExplanationStyle())) {
            sentences.add(cleanFragment(rec.getExplanationStyle()));
        } else if (rec.getTitle() != null && !rec.getTitle().isBlank()) {
            sentences.add("Set \"" + rec.getTitle().trim() + "\" em chọn để bạn dễ mặc lại, không bị lệch gu.");
        }

        if (hasText(rec.getExplanationOccasion())) {
            sentences.add(cleanFragment(rec.getExplanationOccasion()));
        }

        if (hasText(rec.getExplanationColor())) {
            sentences.add(cleanFragment(rec.getExplanationColor()));
        } else if (hasText(rec.getRecommendedColor())) {
            sentences.add("Tông " + rec.getRecommendedColor().trim() + " dễ phối thêm phụ kiện mà vẫn gọn mắt.");
        }

        if (hasText(rec.getExplanationWardrobe())) {
            sentences.add(cleanFragment(rec.getExplanationWardrobe()));
        }

        if (sentences.isEmpty()) {
            return "Em đã ghép set này dựa trên thông tin bạn cung cấp — bạn thử trước, cần chỉnh gì cứ nhắn em nhé.";
        }

        sentences.add("Cần đổi món hay thử size khác, bạn cứ nói em hỗ trợ tiếp.");
        return String.join(" ", sentences);
    }

    private static boolean isStoredNarrative(Recommendation rec) {
        if (!hasText(rec.getExplanationBody())) {
            return false;
        }
        boolean othersEmpty = Stream.of(
                        rec.getExplanationStyle(),
                        rec.getExplanationOccasion(),
                        rec.getExplanationColor())
                .noneMatch(OutfitExplanationComposer::hasText);
        return othersEmpty || rec.getExplanationBody().length() >= 120;
    }

    private static String appendWardrobe(String narrative, String wardrobe) {
        if (!hasText(wardrobe)) {
            return narrative.trim();
        }
        String cleaned = cleanFragment(wardrobe);
        if (narrative.contains(cleaned)) {
            return narrative.trim();
        }
        return narrative.trim() + " " + cleaned;
    }

    private static String genderFitSentence(BodyProfile body) {
        if (body == null || body.getGender() == null || body.getGender() == Gender.OTHER) {
            return null;
        }
        return switch (body.getGender()) {
            case MALE -> "Em chọn toàn món nam/unisex — không gợi ý váy hay item thiên nữ giới.";
            case FEMALE -> "Set này phù hợp nữ giới, form và phom đồ em giữ đúng gu bạn khai báo.";
            case OTHER -> null;
        };
    }

    private static String openingSentence(BodyProfile body, String title) {
        StringBuilder sb = new StringBuilder("Dựa trên thông tin bạn chia sẻ");
        if (body.getHeightCm() != null) {
            sb.append(" — cao ").append(body.getHeightCm()).append("cm");
        }
        if (body.getWeightKg() != null) {
            sb.append(", ").append(body.getWeightKg().stripTrailingZeros().toPlainString()).append("kg");
        }
        sb.append(" — em chọn");
        if (title != null && !title.isBlank()) {
            sb.append(" set \"").append(title.trim()).append("\"");
        } else {
            sb.append(" combo này");
        }
        sb.append(" cho bạn.");
        return sb.toString();
    }

    private static String sizeSentence(
            String size,
            String altSize,
            String form,
            FitPreference fitPreference) {
        if (size == null || size.isBlank()) {
            return null;
        }
        StringBuilder sb = new StringBuilder("Size ").append(size.trim());
        if (altSize != null && !altSize.isBlank() && !altSize.equalsIgnoreCase(size)) {
            sb.append(" (muốn rộng hơn thì thử ").append(altSize.trim()).append(")");
        }
        if (form != null && !form.isBlank()) {
            sb.append(" với form ").append(form.trim());
        }
        String fitLabel = formatFitPreference(fitPreference);
        if (fitLabel != null) {
            sb.append(", đúng gu ").append(fitLabel).append(" bạn thích");
        }
        sb.append(".");
        return sb.toString();
    }

    private static String styleSentence(StyleProfile style, String desiredVibe) {
        String primary = style.getPrimaryStyle();
        if (desiredVibe != null && !desiredVibe.isBlank()) {
            return "Vibe " + desiredVibe.trim() + " bạn muốn thì set này đi đúng hướng, mặc lại cũng không bị nhàm.";
        }
        if (primary != null && !primary.isBlank() && !isGenericStyle(primary)) {
            return "Gu " + primary.trim() + " của bạn nên em giữ phom gọn, dễ phối thêm áo khoác hay giày là ổn.";
        }
        return "Set cân bằng, dễ mặc hàng ngày mà vẫn gọn gàng — không cần nghĩ nhiều khi mix đồ.";
    }

    private static String occasionSentence(String occasion) {
        if (occasion == null || occasion.isBlank()) {
            return null;
        }
        return "Đi " + occasion.trim() + " thì combo này vừa thoải mái vừa lịch sự, không bị quá tay.";
    }

    private static String colorSentence(String color, SkinTone skinTone, StyleProfile style) {
        if (color == null || color.isBlank()) {
            return null;
        }
        StringBuilder sb = new StringBuilder("Em ưu tiên tông ").append(color.trim());
        if (skinTone != null && skinTone != SkinTone.UNSURE) {
            sb.append(" vì hợp tone da ").append(formatSkinTone(skinTone));
        } else if (style.getPreferredColors() != null && !style.getPreferredColors().isEmpty()) {
            sb.append(" — gần với màu bạn hay chọn");
        }
        sb.append(", mix-match cũng không khó.");
        return sb.toString();
    }

    private static String wardrobeSentence(int wardrobeCount) {
        return "Em cũng xem qua tủ đồ của bạn — còn "
                + wardrobeCount
                + " món có thể ghép thêm nếu muốn đổi gió.";
    }

    private static String cleanFragment(String text) {
        String cleaned = text.trim();
        if (cleaned.endsWith(".")) {
            return cleaned;
        }
        return cleaned + ".";
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static boolean isGenericStyle(String style) {
        String normalized = style.trim().toLowerCase(Locale.ROOT);
        return normalized.equals("đa dạng") || normalized.equals("diverse") || normalized.equals("casual");
    }

    private static String formatFitPreference(FitPreference preference) {
        if (preference == null || preference == FitPreference.UNSURE) {
            return null;
        }
        return switch (preference) {
            case SLIM -> "ôm vừa";
            case REGULAR -> "vừa vặn";
            case RELAXED -> "thoải mái";
            case OVERSIZE -> "rộng rãi";
            default -> null;
        };
    }

    private static String formatSkinTone(SkinTone skinTone) {
        return switch (skinTone) {
            case FAIR -> "sáng";
            case MEDIUM -> "trung bình";
            case TAN -> "ngăm";
            case DEEP -> "đậm";
            default -> null;
        };
    }
}
