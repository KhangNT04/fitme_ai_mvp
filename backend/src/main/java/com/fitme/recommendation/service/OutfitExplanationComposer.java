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
        OccasionTone tone = occasionTone(occasion);
        String styleLabel = style != null ? style.getPrimaryStyle() : null;
        List<String> paragraphs = new ArrayList<>();

        paragraphs.add(openingParagraph(
                body, styleLabel, desiredVibe, tone, occasion, items, title, recommendedForm,
                recommendedSize, alternativeSize));
        paragraphs.add(colorAndFinishParagraph(
                body, styleLabel, desiredVibe, tone, recommendedColor, items, wardrobeCount));

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
            String styleLabel,
            String desiredVibe,
            OccasionTone tone,
            String occasion,
            List<OutfitItemRef> items,
            String title,
            String recommendedForm,
            String recommendedSize,
            String alternativeSize) {
        StringBuilder sb = new StringBuilder();
        appendBodyContext(sb, body);
        String combo = describeComboNaturally(sortByRole(items), recommendedForm, title, tone);
        if (combo != null) {
            sb.append(combo).append(" ");
        }
        if (appendBodyShapeHint(sb, body, tone)) {
            sb.append(" ");
        }
        sb.append(occasionFeel(tone, occasion, styleLabel, desiredVibe));
        appendSizeAdvice(sb, recommendedSize, alternativeSize, tone, body);
        return sb.toString().trim();
    }

    private String colorAndFinishParagraph(
            BodyProfile body,
            String styleLabel,
            String desiredVibe,
            OccasionTone tone,
            String recommendedColor,
            List<OutfitItemRef> items,
            int wardrobeCount) {
        StringBuilder sb = new StringBuilder();
        if (recommendedColor != null && !recommendedColor.isBlank()) {
            sb.append(colorAdvice(tone, recommendedColor, body, styleLabel, desiredVibe)).append(" ");
        }
        sb.append(finishWithFootwearAndAccessories(tone, styleLabel, items));
        if (wardrobeCount > 0) {
            sb.append(" ").append(wardrobeAdvice(tone, wardrobeCount));
        }
        return sb.toString().trim();
    }

    private static void appendBodyContext(StringBuilder sb, BodyProfile body) {
        boolean hasMeasure = body.getHeightCm() != null || body.getWeightKg() != null;
        String fitLabel = formatFitPreference(body.getFitPreference());
        if (!hasMeasure && fitLabel == null) {
            return;
        }
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
    }

    private static String describeComboNaturally(
            List<OutfitItemRef> sorted,
            String recommendedForm,
            String title,
            OccasionTone tone) {
        if (sorted.isEmpty()) {
            if (title != null && !title.isBlank()) {
                return "bạn có thể thử set \"" + title.trim() + "\" — " + comboFallbackByTone(tone);
            }
            return "bạn có thể thử set em ghép sẵn từ danh mục.";
        }

        OutfitItemRef top = findByRole(sorted, ItemRole.TOP);
        OutfitItemRef bottom = findByRole(sorted, ItemRole.BOTTOM);
        OutfitItemRef onePiece = findByRole(sorted, ItemRole.ONE_PIECE);
        String formSuffix = formPhrase(recommendedForm);
        String lead = comboLead(tone);

        if (onePiece != null) {
            return lead + lowercaseFirst(toNaturalName(onePiece)) + formSuffix + ".";
        }
        if (top != null && bottom != null) {
            return lead + lowercaseFirst(toNaturalName(top)) + formSuffix
                    + " phối cùng " + lowercaseFirst(toNaturalName(bottom)) + ".";
        }
        OutfitItemRef primary = sorted.getFirst();
        return lead + lowercaseFirst(toNaturalName(primary)) + formSuffix + ".";
    }

    private static String comboLead(OccasionTone tone) {
        return switch (tone) {
            case OFFICE -> "hướng công sở nên ưu tiên ";
            case OUTING -> "đi chơi nên chọn ";
            case DAILY -> "mặc hằng ngày nên lấy ";
            case PARTY -> "cho buổi tối nên chọn ";
            default -> "bạn có thể chọn ";
        };
    }

    private static String comboFallbackByTone(OccasionTone tone) {
        return switch (tone) {
            case OFFICE -> "gọn, chỉn chu cho giờ làm.";
            case OUTING -> "nhẹ, dễ di chuyển cả buổi.";
            case DAILY -> "basic, mặc lại nhiều lần trong tuần.";
            case PARTY -> "có điểm nhấn nhưng vẫn dễ đứng ngồi.";
            default -> "combo gọn, dễ mặc ngay.";
        };
    }

    private static void appendSizeAdvice(
            StringBuilder sb,
            String recommendedSize,
            String alternativeSize,
            OccasionTone tone,
            BodyProfile body) {
        if (recommendedSize == null || recommendedSize.isBlank()) {
            return;
        }
        sb.append(" Size ").append(recommendedSize.trim());
        sb.append(sizeReason(tone, body));
        if (alternativeSize != null && !alternativeSize.isBlank()
                && !alternativeSize.equalsIgnoreCase(recommendedSize)) {
            sb.append(altSizeAdvice(tone, alternativeSize.trim()));
        }
        sb.append(".");
    }

    private static String sizeReason(OccasionTone tone, BodyProfile body) {
        String fitLabel = formatFitPreference(body != null ? body.getFitPreference() : null);
        return switch (tone) {
            case OFFICE -> fitLabel != null
                    ? " giữ form " + fitLabel + " dưới áo khoác hoặc khi ngồi làm việc lâu"
                    : " giữ form gọn khi ngồi làm việc lâu";
            case OUTING -> " giúp set thoáng khi đi cafe, dạo phố hoặc đứng ngồi nhiều";
            case DAILY -> " cân bằng giữa mặc đẹp và tiện hoạt động cả ngày";
            case PARTY -> " giúp tổng thể gọn khi đứng lâu hoặc di chuyển trong tiệc";
            default -> " sẽ hợp nếu bạn muốn áo ôm vừa người";
        };
    }

    private static String altSizeAdvice(OccasionTone tone, String altSize) {
        return switch (tone) {
            case OFFICE -> "; nếu cần rộng hơn chút khi mặc cả ngày ở văn phòng, cân nhắc size " + altSize;
            case OUTING -> "; muốn thoải mái hơn khi đi chơi lâu, có thể lên size " + altSize;
            case DAILY -> "; thích nới hơn một chút cho ngày dài, thử size " + altSize;
            case PARTY -> "; muốn dễ cử động hơn trong tiệc, cân nhắc size " + altSize;
            default -> "; còn nếu thích thoải mái hơn một chút, bạn có thể cân nhắc lên size " + altSize;
        };
    }

    private static String colorAdvice(
            OccasionTone tone,
            String recommendedColor,
            BodyProfile body,
            String styleLabel,
            String desiredVibe) {
        String color = recommendedColor.trim().toLowerCase(Locale.ROOT);
        String skin = body.getSkinTone() != null && body.getSkinTone() != SkinTone.UNSURE
                ? formatSkinTone(body.getSkinTone())
                : null;
        String vibeBit = hasText(desiredVibe) ? " hướng \"" + desiredVibe.trim().toLowerCase(Locale.ROOT) + "\"" : "";
        String styleBit = hasText(styleLabel) && !isGenericStyle(styleLabel)
                ? " hợp gu " + styleLabel.trim()
                : "";

        return switch (tone) {
            case OFFICE -> "Về màu sắc, " + color
                    + " giúp set nhìn chỉn chu, dễ ghép với áo khoác công sở"
                    + (skin != null ? " và hợp tông da " + skin : "")
                    + ".";
            case OUTING -> "Về màu sắc, " + color
                    + " tạo cảm giác nhẹ khi đi chơi"
                    + vibeBit
                    + (skin != null ? ", hợp tông da " + skin : "")
                    + styleBit
                    + " mà không bị nặng mắt.";
            case DAILY -> "Về màu sắc, " + color
                    + " là tông dễ mặc lại nhiều lần trong tuần"
                    + (skin != null ? ", hợp tông da " + skin : "")
                    + ", phối nhanh với đồ sẵn có.";
            case PARTY -> "Về màu sắc, " + color
                    + " tạo điểm nhấn vừa đủ cho buổi tối"
                    + vibeBit
                    + (skin != null ? " và hợp tông da " + skin : "")
                    + ".";
            default -> "Về màu sắc, " + color
                    + " dễ phối"
                    + (skin != null ? ", hợp tông da " + skin : ", hợp nhiều tông da")
                    + ".";
        };
    }

    private static String finishWithFootwearAndAccessories(
            OccasionTone tone,
            String styleLabel,
            List<OutfitItemRef> items) {
        OutfitItemRef shoes = findByRole(sortByRole(items), ItemRole.SHOES);
        String shoeHint = shoes != null
                ? lowercaseFirst(toNaturalName(shoes))
                : footwearSuggestion(tone);
        String extra = accessorySuggestion(tone, styleLabel);

        return switch (tone) {
            case OFFICE -> "Hoàn thiện bằng " + shoeHint
                    + " để set nhìn chỉn chu hơn. "
                    + "Muốn tăng độ chỉnh chu, thêm " + extra + " là đủ.";
            case OUTING -> "Hoàn thiện bằng " + shoeHint
                    + " để đi lại cả buổi vẫn nhẹ. "
                    + "Nếu muốn set có điểm nhấn, thêm " + extra + ".";
            case DAILY -> "Hoàn thiện bằng " + shoeHint
                    + " để mặc nhanh mỗi sáng. "
                    + "Cần đổi mood nhẹ, thêm " + extra + " là xong.";
            case PARTY -> "Hoàn thiện bằng " + shoeHint
                    + " để set có điểm nhấn rõ hơn. "
                    + "Muốn nổi hơn một chút, thêm " + extra + ".";
            default -> "Bạn có thể hoàn thiện set bằng " + shoeHint
                    + ". Nếu muốn bớt đơn giản, thêm " + extra + ".";
        };
    }

    private static String wardrobeAdvice(OccasionTone tone, int wardrobeCount) {
        return switch (tone) {
            case OFFICE -> "Trong tủ còn " + wardrobeCount + " món có thể thay áo/quần để hợp lịch họp khác nhau.";
            case OUTING -> "Trong tủ còn " + wardrobeCount + " món có thể đổi để set đi chơi trông mới hơn.";
            case DAILY -> "Trong tủ còn " + wardrobeCount + " món dễ ghép thêm cho các ngày trong tuần.";
            case PARTY -> "Trong tủ còn " + wardrobeCount + " món có thể đổi phụ kiện/áo khoác cho buổi tối.";
            default -> "Trong tủ đồ bạn còn " + wardrobeCount + " món có thể ghép thêm nếu muốn đổi gió.";
        };
    }

    private static String occasionFeel(
            OccasionTone tone,
            String occasion,
            String styleLabel,
            String desiredVibe) {
        String occasionLabel = hasText(occasion) ? occasion.trim() : null;
        String styleBit = hasText(styleLabel) && !isGenericStyle(styleLabel)
                ? " theo gu " + styleLabel.trim()
                : "";
        String vibeBit = hasText(desiredVibe)
                ? " với vibe \"" + desiredVibe.trim() + "\""
                : "";

        return switch (tone) {
            case OFFICE -> "Set này hướng"
                    + (occasionLabel != null ? " " + occasionLabel.toLowerCase(Locale.ROOT) : " công sở")
                    + styleBit
                    + ": gọn, chỉn chu nhưng vẫn ngồi làm việc thoải mái cả ngày.";
            case OUTING -> "Set này hợp"
                    + (occasionLabel != null ? " " + occasionLabel.toLowerCase(Locale.ROOT) : " đi chơi")
                    + styleBit
                    + vibeBit
                    + " — nhẹ, có điểm nhấn vừa phải, dễ di chuyển cả buổi.";
            case DAILY -> "Set này dành cho"
                    + (occasionLabel != null ? " " + occasionLabel.toLowerCase(Locale.ROOT) : " mặc hằng ngày")
                    + styleBit
                    + ": basic, mau mặc, dễ phối lại nhiều lần trong tuần.";
            case PARTY -> "Set này cho"
                    + (occasionLabel != null ? " " + occasionLabel.toLowerCase(Locale.ROOT) : " buổi tối")
                    + styleBit
                    + vibeBit
                    + " — nổi bật vừa đủ mà vẫn đứng ngồi thoải mái.";
            default -> "Set này cân bằng"
                    + styleBit
                    + vibeBit
                    + ", dễ mặc lại nhiều lần trong tuần.";
        };
    }

    private static String footwearSuggestion(OccasionTone tone) {
        return switch (tone) {
            case OFFICE -> "một đôi loafer hoặc giày tây tối màu";
            case OUTING -> "một đôi sneaker sạch hoặc sandal chắc chân";
            case DAILY -> "một đôi sneaker trắng hoặc xám nhạt";
            case PARTY -> "một đôi mule hoặc giày cao vừa phải";
            default -> "một đôi giày trung tính";
        };
    }

    private static String accessorySuggestion(OccasionTone tone, String styleLabel) {
        if (hasText(styleLabel)) {
            String lower = styleLabel.toLowerCase(Locale.ROOT);
            if (lower.contains("street")) {
                return "một túi đeo chéo nhỏ hoặc mũ lưỡi trai";
            }
            if (lower.contains("office") || lower.contains("chic")) {
                return "một túi tote bản vừa hoặc đồng hồ dây kim loại";
            }
            if (lower.contains("minimal")) {
                return "một túi nhỏ trung tính hoặc đồng hồ basic";
            }
        }
        return switch (tone) {
            case OFFICE -> "một túi tote da bản vừa hoặc đồng hồ basic";
            case OUTING -> "một túi đeo chéo nhỏ hoặc kính mát";
            case DAILY -> "một túi vải nhỏ hoặc đồng hồ basic";
            case PARTY -> "một clutch nhỏ hoặc sợi dây chuyền mảnh";
            default -> "một túi xách gọn hoặc đồng hồ basic";
        };
    }

    private static boolean appendBodyShapeHint(StringBuilder sb, BodyProfile body, OccasionTone tone) {
        java.math.BigDecimal waist = body.getWaistCm();
        java.math.BigDecimal hip = body.getHipCm();
        Integer height = body.getHeightCm();

        if (waist != null && hip != null && hip.compareTo(waist.multiply(java.math.BigDecimal.valueOf(1.08))) > 0) {
            sb.append(switch (tone) {
                case OFFICE -> "Form quần/chân váy cạp cao giúp vòng hông cân hơn khi mặc cả ngày ở văn phòng.";
                case OUTING -> "Form cạp cao hoặc xòe nhẹ giúp cân vòng hông và thoải mái khi đi chơi.";
                case DAILY -> "Form cạp cao giúp cân vòng hông mà vẫn tiện mặc hằng ngày.";
                case PARTY -> "Form cạp cao hoặc xòe nhẹ giúp cân vòng hông và hack dáng khi đứng lâu.";
                default -> "Form quần/chân váy cạp cao hoặc xòe nhẹ sẽ cân bằng vòng hông và giúp chân trông dài hơn.";
            });
            return true;
        }
        if (height != null && height < 155) {
            sb.append(switch (tone) {
                case OFFICE -> "Tỉ lệ top–bottom được chọn để giữ dáng gọn khi mặc đồ công sở.";
                case OUTING -> "Tỉ lệ top–bottom giúp chân trông dài hơn khi đi chơi.";
                case DAILY -> "Tỉ lệ top–bottom giúp set hằng ngày nhìn gọn và hack dáng.";
                case PARTY -> "Tỉ lệ top–bottom giúp đôi chân trông dài hơn trong buổi tối.";
                default -> "Tỉ lệ top–bottom em chọn giúp đôi chân trông dài và hack dáng hiệu quả.";
            });
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
        OFFICE, OUTING, DAILY, PARTY, GENERAL
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
                || lower.contains("gala") || lower.contains("hẹn hò buổi tối")) {
            return OccasionTone.PARTY;
        }
        if (lower.contains("hằng ngày") || lower.contains("hang ngay") || lower.contains("hàng ngày")
                || lower.contains("everyday") || lower.equals("casual") || lower.contains("casual hằng")
                || lower.contains("casual hang")) {
            return OccasionTone.DAILY;
        }
        if (lower.contains("cafe") || lower.contains("chơi") || lower.contains("cuối tuần")
                || lower.contains("cuoi tuan") || lower.contains("hẹn") || lower.contains("dạo")
                || lower.contains("phố") || lower.contains("du lịch") || lower.contains("weekend")) {
            return OccasionTone.OUTING;
        }
        if (lower.contains("casual")) {
            return OccasionTone.DAILY;
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
