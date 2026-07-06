package com.fitme.recommendation.service;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.SkinTone;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

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
                .build();
        StyleProfile style = StyleProfile.builder().primaryStyle("Casual").build();

        String text = composer.composeForCustomer(
                body, style, "Casual hàng ngày", null,
                "S", "M", "Vừa vặn (Regular)", "Trắng", 0,
                "Outfit Casual hàng ngày phong cách Casual");

        assertThat(text).contains("165cm");
        assertThat(text).contains("Size S");
        assertThat(text).contains("Trắng");
        assertThat(text).doesNotContain("Phù hợp dáng");
        assertThat(text).doesNotContain("Phù hợp gu");
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
