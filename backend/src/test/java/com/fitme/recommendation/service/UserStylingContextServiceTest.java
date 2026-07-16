package com.fitme.recommendation.service;

import com.fitme.userprofile.entity.BodyProfile;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class UserStylingContextServiceTest {

    private final UserStylingContextService service = new UserStylingContextService();

    @Test
    void matureUserGetsMatureDefaultStylesWithoutYouthRequest() {
        BodyProfile body = BodyProfile.builder().age(50).build();

        List<String> styles = service.suggestDefaultStyles(body, "Gợi ý đồ đẹp cho mình", List.of());

        assertThat(styles).contains("Minimal", "Office Chic", "Vintage");
        assertThat(styles).doesNotContain("Streetwear", "Korean Casual");
    }

    @Test
    void matureUserCanRequestYouthfulLookInChat() {
        BodyProfile body = BodyProfile.builder().age(52).build();

        List<String> styles = service.suggestDefaultStyles(
                body,
                "Mình muốn outfit trẻ trung streetwear đi cafe",
                List.of());

        assertThat(styles).contains("Streetwear");
        assertThat(service.isYouthfulLookRequested("Mình muốn outfit trẻ trung streetwear")).isTrue();
    }

    @Test
    void harmonizeFiltersYouthStylesForMatureUnlessExplicit() {
        BodyProfile body = BodyProfile.builder().age(55).build();

        List<String> harmonized = service.harmonizeStylesWithProfile(
                body,
                "Gợi ý đồ đi làm",
                List.of("Streetwear", "Korean Casual", "Minimal"));

        assertThat(harmonized).contains("Minimal");
        assertThat(harmonized.stream().filter(s -> s.equals("Streetwear") || s.equals("Korean Casual")).count())
                .isLessThanOrEqualTo(1);
    }

    @Test
    void ageAlignmentPenalizesYouthfulProductForMatureUser() {
        BodyProfile body = BodyProfile.builder().age(50).build();

        double mature = service.scoreAgeAlignment(
                body,
                null,
                "Minimal",
                List.of("linen", "classic"),
                "Áo sơ mi linen classic",
                "Áo");
        double youthful = service.scoreAgeAlignment(
                body,
                null,
                "Streetwear",
                List.of("hoodie", "oversized"),
                "Hoodie graphic oversized",
                "Áo khoác");

        assertThat(mature).isGreaterThan(youthful);
    }
}
