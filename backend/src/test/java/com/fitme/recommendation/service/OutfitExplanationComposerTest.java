package com.fitme.recommendation.service;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.Gender;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.SkinTone;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OutfitExplanationComposerTest {

    private final OutfitExplanationComposer composer = new OutfitExplanationComposer();

    @Test
    void composeForCustomer_readsLikeSalesAdvice() {
        BodyProfile body = BodyProfile.builder()
                .heightCm(165)
                .weightKg(BigDecimal.valueOf(55))
                .fitPreference(FitPreference.REGULAR)
                .skinTone(SkinTone.MEDIUM)
                .gender(Gender.FEMALE)
                .build();
        StyleProfile style = StyleProfile.builder().primaryStyle("Korean Casual").build();

        List<OutfitExplanationComposer.OutfitItemRef> items = List.of(
                new OutfitExplanationComposer.OutfitItemRef("Áo thun basic", "Áo thun", ItemRole.TOP, "Trắng"),
                new OutfitExplanationComposer.OutfitItemRef("Quần jean slim", "Quần jean", ItemRole.BOTTOM, "Xanh"));

        String text = composer.composeForCustomer(
                body, style, "Đi cafe", "Nhẹ nhàng",
                "S", "M", "Vừa vặn (Regular)", "Trắng", 0,
                "Outfit Đi cafe phong cách Korean Casual", items);

        assertThat(text).contains("165cm");
        assertThat(text).contains("[Áo thun basic]");
        assertThat(text).contains("[Quần jean slim]");
        assertThat(text).contains("\n\n");
        assertThat(text).doesNotContain("Phù hợp dáng");
        assertThat(text).doesNotContain("Phù hợp gu");
        assertThat(text).doesNotContain("Em chọn toàn món nam/unisex");
        assertThat(text).contains("?");
    }

    @Test
    void composeForCustomer_officeOccasion_suggestsProfessionalAccessories() {
        BodyProfile body = BodyProfile.builder()
                .heightCm(168)
                .weightKg(BigDecimal.valueOf(58))
                .waistCm(BigDecimal.valueOf(70))
                .hipCm(BigDecimal.valueOf(95))
                .fitPreference(FitPreference.REGULAR)
                .gender(Gender.FEMALE)
                .build();
        StyleProfile style = StyleProfile.builder().primaryStyle("Minimal").build();

        String text = composer.composeForCustomer(
                body, style, "Đi làm công sở", null,
                "M", "L", "Regular", "Đen", 0,
                "Outfit công sở", List.of(
                        new OutfitExplanationComposer.OutfitItemRef("Áo sơ mi", "Áo sơ mi", ItemRole.TOP, null),
                        new OutfitExplanationComposer.OutfitItemRef("Quần âu", "Quần âu", ItemRole.BOTTOM, null)));

        assertThat(text).contains("công sở");
        assertThat(text).contains("giày");
        assertThat(text).contains("vòng hông");
    }

    @Test
    void resolveSummary_weavesLegacyFields() {
        Recommendation rec = Recommendation.builder()
                .title("Outfit test")
                .recommendedSize("S")
                .recommendedForm("Vừa vặn (Regular)")
                .recommendedColor("Trắng")
                .explanationBody("Form Vừa vặn (Regular) giúp tổng thể thoải mái.")
                .explanationStyle("Gợi ý cân bằng, dễ mặc hàng ngày.")
                .explanationOccasion("Phù hợp cho Casual hàng ngày vì nhẹ nhàng.")
                .explanationColor("Màu Trắng tạo cảm giác hài hòa.")
                .build();

        String summary = composer.resolveSummary(rec);

        assertThat(summary).contains("size S");
        assertThat(summary).doesNotContain("Phù hợp dáng:");
        assertThat(summary).doesNotContain("Phù hợp gu:");
    }
}
