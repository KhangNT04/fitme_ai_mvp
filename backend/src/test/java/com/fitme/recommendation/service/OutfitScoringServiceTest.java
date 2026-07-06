package com.fitme.recommendation.service;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.ProductTargetGender;
import com.fitme.common.enums.StockStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.service.ProductAudienceService;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OutfitScoringServiceTest {

    @Mock
    private com.fitme.product.repository.ProductTagRepository tagRepository;
    @Mock
    private com.fitme.admin.repository.StyleRuleRepository styleRuleRepository;
    @Mock
    private com.fitme.admin.repository.OccasionRuleRepository occasionRuleRepository;
    @Mock
    private ProductAudienceService productAudienceService;

    @InjectMocks
    private OutfitScoringService outfitScoringService;

    @Test
    void withinBudget_respectsMax() {
        Product p = Product.builder().price(BigDecimal.valueOf(500000)).build();
        assertThat(outfitScoringService.withinBudget(p, null, BigDecimal.valueOf(400000))).isFalse();
        assertThat(outfitScoringService.withinBudget(p, null, BigDecimal.valueOf(600000))).isTrue();
    }

    @Test
    void scoreProduct_boostsMatchingStyleTag() {
        UUID id = UUID.randomUUID();
        Product p = Product.builder()
                .id(id)
                .fitType(FitPreference.REGULAR)
                .stockStatus(StockStatus.IN_STOCK)
                .build();
        StyleProfile style = StyleProfile.builder().primaryStyle("Minimal").build();
        BodyProfile body = BodyProfile.builder().fitPreference(FitPreference.REGULAR).build();

        when(tagRepository.findByProductId(id)).thenReturn(List.of(
                ProductTag.builder().tagType("STYLE").tagValue("Minimal").build()
        ));
        when(styleRuleRepository.findByActiveTrue()).thenReturn(List.of());
        when(occasionRuleRepository.findByActiveTrue()).thenReturn(List.of());
        when(productAudienceService.resolveTargetGender(p)).thenReturn(ProductTargetGender.UNISEX);

        double score = outfitScoringService.scoreProduct(p, style, "Casual", body);
        assertThat(score).isGreaterThan(30);
    }
}
