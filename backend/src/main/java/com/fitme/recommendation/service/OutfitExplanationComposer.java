package com.fitme.recommendation.service;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.SkinTone;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class OutfitExplanationComposer {

    private static final int ROLE_ORDER_TOP = 0;
    private static final int ROLE_ORDER_BOTTOM = 1;
    private static final int ROLE_ORDER_ONE_PIECE = 2;
    private static final int ROLE_ORDER_OUTER = 3;
    private static final int ROLE_ORDER_SHOES = 4;

    public record OutfitItemRef(
            String displayName,
            String category,
            ItemRole role,
            String selectedColor) {
    }

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
            String title,
            List<OutfitItemRef> items) {
        List<String> paragraphs = new ArrayList<>();

        paragraphs.add(openingParagraph(body, style, occasion, items, title, recommendedForm,
                recommendedSize, alternativeSize));
        paragraphs.add(colorAndFinishParagraph(body, style, occasion, recommendedColor, items, wardrobeCount));

        return paragraphs.stream()
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining("\n\n"));
    }

    public String resolveSummary(Recommendation rec) {
        if (isStoredNarrative(rec)) {
            return appendWardrobe(rec.getExplanationBody(), rec.getExplanationWardrobe());
        }
        return composeFromRecommendation(rec);
    }

    private String openingParagraph(
            BodyProfile body,
            StyleProfile style,
            String occasion,
            List<OutfitItemRef> items,
            String title,
            String recommendedForm,
            String recommendedSize,
            String alternativeSize) {
        StringBuilder sb = new StringBuilder();
        appendBodyContext(sb, body, style);
        String combo = describeComboNaturally(sortByRole(items), recommendedForm, title);
        if (combo != null) {
            sb.append(combo).append(" ");
        }
        if (appendBodyShapeHint(sb, body)) {
            sb.append(" ");
        }
        sb.append(occasionFeel(occasion));
        appendSizeAdvice(sb, recommendedSize, alternativeSize);
        return sb.toString().trim();
    }

    private String colorAndFinishParagraph(
            BodyProfile body,
            StyleProfile style,
            String occasion,
            String recommendedColor,
            List<OutfitItemRef> items,
            int wardrobeCount) {
        StringBuilder sb = new StringBuilder();
        if (recommendedColor != null && !recommendedColor.isBlank()) {
            sb.append("Về màu sắc, ").append(recommendedColor.trim().toLowerCase(Locale.ROOT));
            sb.append(" là lựa chọn an toàn vì dễ phối");
            if (body.getSkinTone() != null && body.getSkinTone() != SkinTone.UNSURE) {
                sb.append(", hợp với tông da ").append(formatSkinTone(body.getSkinTone()));
            } else {
                sb.append(", hợp với nhiều tông da");
            }
            sb.append(" và không làm tổng thể bị quá nổi. ");
        }
        sb.append(finishWithFootwearAndAccessories(occasion, items));
        if (wardrobeCount > 0) {
            sb.append(" Trong tủ đồ bạn còn ").append(wardrobeCount)
                    .append(" món có thể ghép thêm nếu muốn đổi gió.");
        }
        return sb.toString().trim();
    }

    private static void appendBodyContext(StringBuilder sb, BodyProfile body, StyleProfile style) {
        boolean hasMeasure = body.getHeightCm() != null || body.getWeightKg() != null;
        String fitLabel = formatFitPreference(body.getFitPreference());
        if (hasMeasure || fitLabel != null) {
            sb.append("Với dáng người ");
            if (body.getHeightCm() != null) {
                sb.append("cao khoảng ").append(formatHeightNatural(body.getHeightCm()));
            }
            if (body.getWeightKg() != null) {
                if (body.getHeightCm() != null) {
                    sb.append(", ");
                }
                sb.append("nặng ").append(body.getWeightKg().stripTrailingZeros().toPlainString()).append("kg");
            }
            if (fitLabel != null) {
                sb.append(" và thích mặc ").append(fitLabel);
            }
            sb.append(", ");
        } else if (style.getPrimaryStyle() != null && !style.getPrimaryStyle().isBlank()
                && !isGenericStyle(style.getPrimaryStyle())) {
            sb.append("Với gu ").append(style.getPrimaryStyle().trim()).append(" bạn chia sẻ, ");
        }
    }

    private static String describeComboNaturally(
            List<OutfitItemRef> sorted,
            String recommendedForm,
            String title) {
        if (sorted.isEmpty()) {
            if (title != null && !title.isBlank()) {
                return "bạn có thể thử set \"" + title.trim() + "\" — combo gọn, dễ mặc ngay.";
            }
            return "bạn có thể thử set em ghép sẵn từ danh mục.";
        }

        OutfitItemRef top = findByRole(sorted, ItemRole.TOP);
        OutfitItemRef bottom = findByRole(sorted, ItemRole.BOTTOM);
        OutfitItemRef onePiece = findByRole(sorted, ItemRole.ONE_PIECE);
        String formSuffix = formPhrase(recommendedForm);

        if (onePiece != null) {
            return "bạn có thể chọn " + lowercaseFirst(toNaturalName(onePiece)) + formSuffix + ".";
        }
        if (top != null && bottom != null) {
            return "bạn có thể chọn " + lowercaseFirst(toNaturalName(top)) + formSuffix
                    + " phối cùng " + lowercaseFirst(toNaturalName(bottom)) + ".";
        }
        OutfitItemRef primary = sorted.getFirst();
        return "bạn có thể chọn " + lowercaseFirst(toNaturalName(primary)) + formSuffix + ".";
    }

    private static void appendSizeAdvice(StringBuilder sb, String recommendedSize, String alternativeSize) {
        if (recommendedSize == null || recommendedSize.isBlank()) {
            return;
        }
        sb.append(" Size ").append(recommendedSize.trim());
        sb.append(" sẽ hợp nếu bạn muốn áo ôm vừa người");
        if (alternativeSize != null && !alternativeSize.isBlank()
                && !alternativeSize.equalsIgnoreCase(recommendedSize)) {
            sb.append("; còn nếu thích thoải mái hơn một chút khi ngồi học, đi chơi hoặc di chuyển nhiều, ");
            sb.append("bạn có thể cân nhắc lên size ").append(alternativeSize.trim());
        }
        sb.append(".");
    }

    private static String finishWithFootwearAndAccessories(String occasion, List<OutfitItemRef> items) {
        OutfitItemRef shoes = findByRole(sortByRole(items), ItemRole.SHOES);
        String shoeHint = shoes != null
                ? lowercaseFirst(toNaturalName(shoes))
                : footwearSuggestion(occasionTone(occasion));

        OccasionTone tone = occasionTone(occasion);
        String extra = switch (tone) {
            case OFFICE -> "một túi tote da bản vừa hoặc đồng hồ basic";
            case PARTY -> "một clutch nhỏ hoặc sợi dây chuyền mảnh";
            case CASUAL -> "một túi đeo chéo nhỏ hoặc đồng hồ basic";
            default -> "một túi xách gọn hoặc đồng hồ basic";
        };

        return "Bạn có thể hoàn thiện set bằng " + shoeHint
                + " để giữ cảm giác sạch sẽ, trẻ trung. "
                + "Nếu muốn set đồ bớt đơn giản, thêm " + extra + " là đủ.";
    }

    private static String occasionFeel(String occasion) {
        return switch (occasionTone(occasion)) {
            case OFFICE -> "Set này gọn gàng, đủ chỉn chu cho công sở mà vẫn thoải mái cả ngày.";
            case PARTY -> "Set này giúp bạn nổi bật vừa phải mà vẫn dễ di chuyển.";
            case CASUAL -> "Set này khá dễ mặc hằng ngày, không quá nghiêm túc nhưng vẫn gọn gàng.";
            default -> "Set này cân bằng, dễ mặc lại nhiều lần trong tuần.";
        };
    }

    private static String footwearSuggestion(OccasionTone tone) {
        return switch (tone) {
            case OFFICE -> "một đôi giày tây hoặc loafer";
            case PARTY -> "một đôi giày cao gót vừa phải hoặc mule";
            case CASUAL -> "một đôi sneaker trắng hoặc xám nhạt";
            default -> "một đôi giày trung tính";
        };
    }

    private static boolean appendBodyShapeHint(StringBuilder sb, BodyProfile body) {
        java.math.BigDecimal waist = body.getWaistCm();
        java.math.BigDecimal hip = body.getHipCm();
        Integer height = body.getHeightCm();

        if (waist != null && hip != null && hip.compareTo(waist.multiply(java.math.BigDecimal.valueOf(1.08))) > 0) {
            sb.append("Form quần/chân váy cạp cao hoặc xòe nhẹ sẽ cân bằng vòng hông và giúp chân trông dài hơn.");
            return true;
        }
        if (height != null && height < 155) {
            sb.append("Tỉ lệ top–bottom em chọn giúp đôi chân trông dài và hack dáng hiệu quả.");
            return true;
        }
        return false;
    }

    private static OutfitItemRef findByRole(List<OutfitItemRef> items, ItemRole role) {
        if (items == null) {
            return null;
        }
        return items.stream()
                .filter(i -> i.role() == role)
                .findFirst()
                .orElse(null);
    }

    private static String toNaturalName(OutfitItemRef item) {
        if (item.displayName() != null && !item.displayName().isBlank()) {
            return item.displayName().trim();
        }
        if (item.category() != null && !item.category().isBlank()) {
            return item.category().trim();
        }
        return "món này";
    }

    private static String lowercaseFirst(String text) {
        if (text == null || text.isBlank()) {
            return text;
        }
        String trimmed = text.trim();
        return Character.toLowerCase(trimmed.charAt(0)) + trimmed.substring(1);
    }

    private static String formPhrase(String recommendedForm) {
        if (recommendedForm == null || recommendedForm.isBlank()) {
            return "";
        }
        String lower = recommendedForm.toLowerCase(Locale.ROOT);
        if (lower.contains("regular") || lower.contains("vừa vặn")) {
            return " form regular";
        }
        if (lower.contains("slim") || lower.contains("ôm")) {
            return " form slim";
        }
        if (lower.contains("relaxed") || lower.contains("thoải")) {
            return " form relaxed";
        }
        if (lower.contains("oversize") || lower.contains("rộng")) {
            return " form rộng";
        }
        return "";
    }

    private static String formatHeightNatural(int heightCm) {
        int meters = heightCm / 100;
        int remainder = heightCm % 100;
        if (remainder == 0) {
            return meters + "m";
        }
        return meters + "m" + remainder;
    }

    private static List<OutfitItemRef> sortByRole(List<OutfitItemRef> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        return items.stream()
                .sorted(Comparator.comparingInt(OutfitExplanationComposer::roleSortKey))
                .toList();
    }

    private static int roleSortKey(OutfitItemRef item) {
        if (item.role() == null) {
            return 99;
        }
        return switch (item.role()) {
            case TOP -> ROLE_ORDER_TOP;
            case BOTTOM -> ROLE_ORDER_BOTTOM;
            case ONE_PIECE -> ROLE_ORDER_ONE_PIECE;
            case OUTERWEAR -> ROLE_ORDER_OUTER;
            case SHOES -> ROLE_ORDER_SHOES;
            default -> 50;
        };
    }

    private enum OccasionTone {
        OFFICE, CASUAL, PARTY, GENERAL
    }

    private static OccasionTone occasionTone(String occasion) {
        if (occasion == null || occasion.isBlank()) {
            return OccasionTone.GENERAL;
        }
        String lower = occasion.toLowerCase(Locale.ROOT);
        if (lower.contains("làm") || lower.contains("công sở") || lower.contains("văn phòng")
                || lower.contains("office")) {
            return OccasionTone.OFFICE;
        }
        if (lower.contains("tiệc") || lower.contains("sự kiện") || lower.contains("party")
                || lower.contains("gala")) {
            return OccasionTone.PARTY;
        }
        if (lower.contains("cafe") || lower.contains("chơi") || lower.contains("hẹn")
                || lower.contains("dạo") || lower.contains("phố") || lower.contains("hàng ngày")
                || lower.contains("casual")) {
            return OccasionTone.CASUAL;
        }
        return OccasionTone.GENERAL;
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
