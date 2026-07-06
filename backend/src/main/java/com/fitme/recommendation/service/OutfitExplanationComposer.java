package com.fitme.recommendation.service;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.Gender;
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

        paragraphs.add(acknowledgeParagraph(body, style, occasion, desiredVibe));
        paragraphs.add(proposalParagraph(items, title));
        paragraphs.add(whyParagraph(body, style, occasion, recommendedSize, alternativeSize,
                recommendedForm, recommendedColor, items));
        paragraphs.add(mixMatchParagraph(occasion, wardrobeCount));
        paragraphs.add(callToActionParagraph());

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

    private String acknowledgeParagraph(
            BodyProfile body,
            StyleProfile style,
            String occasion,
            String desiredVibe) {
        StringBuilder sb = new StringBuilder("Dạ, em đã nhận được thông tin của bạn");
        if (occasion != null && !occasion.isBlank()) {
            sb.append(" — bạn đang tìm set đồ cho ").append(occasion.trim().toLowerCase(Locale.forLanguageTag("vi")));
        }
        if (desiredVibe != null && !desiredVibe.isBlank()) {
            sb.append(", vibe ").append(desiredVibe.trim());
        } else if (style.getPrimaryStyle() != null && !style.getPrimaryStyle().isBlank()
                && !isGenericStyle(style.getPrimaryStyle())) {
            sb.append(", gu ").append(style.getPrimaryStyle().trim());
        }
        sb.append(".");
        if (body.getHeightCm() != null || body.getWeightKg() != null) {
            sb.append(" Với số đo ");
            if (body.getHeightCm() != null) {
                sb.append("cao ").append(body.getHeightCm()).append("cm");
            }
            if (body.getWeightKg() != null) {
                if (body.getHeightCm() != null) {
                    sb.append(", ");
                }
                sb.append(body.getWeightKg().stripTrailingZeros().toPlainString()).append("kg");
            }
            String fitLabel = formatFitPreference(body.getFitPreference());
            if (fitLabel != null) {
                sb.append(" và thích form ").append(fitLabel);
            }
            sb.append(", em sẽ ưu tiên phom vừa vặn mà vẫn thoải mái.");
        }
        return sb.toString();
    }

    private String proposalParagraph(List<OutfitItemRef> items, String title) {
        List<OutfitItemRef> sorted = sortByRole(items);
        if (sorted.isEmpty()) {
            if (title != null && !title.isBlank()) {
                return "Em đặc biệt gợi ý bạn thử set \"" + title.trim()
                        + "\" — combo em chọn để bạn mặc ngay không cần nghĩ nhiều.";
            }
            return "Em đã ghép một set cân bằng để bạn thử trước.";
        }

        StringBuilder sb = new StringBuilder("Em gợi ý bạn kết hợp ");
        List<String> named = new ArrayList<>();
        for (OutfitItemRef item : sorted) {
            String label = formatItemLabel(item);
            if (label != null) {
                named.add("[" + label + "]");
            }
        }
        if (named.isEmpty()) {
            return "Em đã ghép set phù hợp từ các món trong danh mục — bạn xem thử nhé.";
        }
        if (named.size() == 1) {
            sb.append(named.getFirst());
        } else if (named.size() == 2) {
            sb.append(named.get(0)).append(" đi cùng ").append(named.get(1));
        } else {
            sb.append(String.join(", ", named.subList(0, named.size() - 1)))
                    .append(" và ").append(named.getLast());
        }
        sb.append(".");
        return sb.toString();
    }

    private String whyParagraph(
            BodyProfile body,
            StyleProfile style,
            String occasion,
            String recommendedSize,
            String alternativeSize,
            String recommendedForm,
            String recommendedColor,
            List<OutfitItemRef> items) {
        StringBuilder sb = new StringBuilder("Lý do em chọn set này là ");

        boolean hasBodyShape = appendBodyShapeHint(sb, body);
        if (!hasBodyShape) {
            sb.append("vì ");
        }

        if (recommendedSize != null && !recommendedSize.isBlank()) {
            sb.append("size ").append(recommendedSize.trim());
            if (alternativeSize != null && !alternativeSize.isBlank()
                    && !alternativeSize.equalsIgnoreCase(recommendedSize)) {
                sb.append(" (muốn rộng hơn thì thử ").append(alternativeSize.trim()).append(")");
            }
            if (recommendedForm != null && !recommendedForm.isBlank()) {
                sb.append(" với form ").append(recommendedForm.trim());
            }
            sb.append(" sẽ ôm vừa số đo mà không bị chật cả ngày");
        } else if (recommendedForm != null && !recommendedForm.isBlank()) {
            sb.append("form ").append(recommendedForm.trim()).append(" giúp tổng thể gọn và thoải mái");
        } else {
            sb.append("phom đồ em chọn cân đối, dễ mặc");
        }
        sb.append(". ");

        appendGenderFitNaturally(sb, body, items);

        if (recommendedColor != null && !recommendedColor.isBlank()) {
            sb.append("Tông ").append(recommendedColor.trim());
            if (body.getSkinTone() != null && body.getSkinTone() != SkinTone.UNSURE) {
                sb.append(" hợp tone da ").append(formatSkinTone(body.getSkinTone()));
            } else if (style.getPreferredColors() != null && !style.getPreferredColors().isEmpty()) {
                sb.append(" gần với màu bạn hay chọn");
            }
            sb.append(", dễ phối thêm phụ kiện. ");
        }

        if (occasion != null && !occasion.isBlank()) {
            sb.append("Đi ").append(occasion.trim()).append(" thì set này ");
            sb.append(switch (occasionTone(occasion)) {
                case OFFICE -> "vừa chuyên nghiệp vừa thoải mái suốt ngày dài.";
                case PARTY -> "giúp bạn nổi bật mà vẫn tự tin khi di chuyển.";
                case CASUAL -> "nhẹ nhàng, trẻ trung và dễ chụp hình.";
                default -> "vừa gọn gàng vừa dễ mix lại.";
            });
        }

        return sb.toString().trim();
    }

    private String mixMatchParagraph(String occasion, int wardrobeCount) {
        OccasionTone tone = occasionTone(occasion);
        String accessory = switch (tone) {
            case OFFICE -> "một đôi giày tây hoặc loafer và túi tote da bản vừa";
            case PARTY -> "một sợi dây chuyền mảnh hoặc clutch nhỏ là đủ điểm nhấn";
            case CASUAL -> "một đôi sneaker trắng hoặc sandal đế bệt là outfit đã rất năng động";
            default -> "một đôi giày trung tính và túi xách gọn";
        };
        StringBuilder sb = new StringBuilder("Để hoàn thiện, bạn chỉ cần phối thêm ").append(accessory).append(".");
        if (wardrobeCount > 0) {
            sb.append(" Em cũng thấy trong tủ đồ bạn còn ").append(wardrobeCount)
                    .append(" món có thể ghép thêm nếu muốn đổi gió.");
        }
        return sb.toString();
    }

    private static String callToActionParagraph() {
        return "Bạn thấy set này ổn chưa — hay muốn em đổi sang form rộng hơn, tông màu khác, hoặc thay một món trong combo?";
    }

    private static boolean appendBodyShapeHint(StringBuilder sb, BodyProfile body) {
        java.math.BigDecimal waist = body.getWaistCm();
        java.math.BigDecimal hip = body.getHipCm();
        Integer height = body.getHeightCm();

        if (waist != null && hip != null && hip.compareTo(waist.multiply(java.math.BigDecimal.valueOf(1.08))) > 0) {
            sb.append("form quần/chân váy cạp cao hoặc xòe nhẹ sẽ cân bằng vòng hông và giúp chân trông dài hơn, ");
            return true;
        }
        if (height != null && height < 155) {
            sb.append("tỉ lệ top–bottom em chọn giúp đôi chân trông dài và hack dáng hiệu quả, ");
            return true;
        }
        return false;
    }

    private static void appendGenderFitNaturally(StringBuilder sb, BodyProfile body, List<OutfitItemRef> items) {
        if (body == null || body.getGender() == null || body.getGender() == Gender.OTHER) {
            return;
        }
        boolean hasDress = items != null && items.stream()
                .anyMatch(i -> i.role() == ItemRole.ONE_PIECE
                        || (i.category() != null && i.category().toLowerCase(Locale.ROOT).contains("váy")));
        if (body.getGender() == Gender.MALE) {
            sb.append("Toàn bộ món em chọn đều hướng nam/unisex nên bạn mặc thoải mái, không lệch gu. ");
        } else if (body.getGender() == Gender.FEMALE && !hasDress) {
            sb.append("Set này giữ phom nữ tính nhưng vẫn năng động, đúng gu bạn khai báo. ");
        }
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

    private static String formatItemLabel(OutfitItemRef item) {
        if (item.displayName() != null && !item.displayName().isBlank()) {
            return item.displayName().trim();
        }
        if (item.category() != null && !item.category().isBlank()) {
            return item.category().trim();
        }
        return null;
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
                || lower.contains("dạo") || lower.contains("phố")) {
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
