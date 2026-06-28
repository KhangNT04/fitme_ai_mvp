package com.fitme.recommendation.service;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.SkinTone;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.entity.SizeChart;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import com.fitme.userprofile.entity.BodyProfile;
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
class SizeResolutionServiceTest {

    @Mock
    private SizeChartRepository sizeChartRepository;
    @Mock
    private ProductVariantRepository variantRepository;

    @InjectMocks
    private SizeResolutionService sizeResolutionService;

    @Test
    void resolveSize_usesClosestChestMeasurement() {
        UUID productId = UUID.randomUUID();
        BodyProfile body = BodyProfile.builder()
                .heightCm(170)
                .weightKg(BigDecimal.valueOf(60))
                .fitPreference(FitPreference.REGULAR)
                .skinTone(SkinTone.MEDIUM)
                .chestCm(BigDecimal.valueOf(88))
                .build();

        when(sizeChartRepository.findByProductId(productId)).thenReturn(List.of(
                SizeChart.builder().productId(productId).sizeLabel("M").chestCm(BigDecimal.valueOf(88)).build(),
                SizeChart.builder().productId(productId).sizeLabel("L").chestCm(BigDecimal.valueOf(98)).build()
        ));
        when(variantRepository.findByProductId(productId)).thenReturn(List.of());

        assertThat(sizeResolutionService.resolveSize(body, productId)).isEqualTo("M");
    }

    @Test
    void recommendSizeHeuristic_returnsSForShortHeight() {
        BodyProfile body = BodyProfile.builder().heightCm(155).weightKg(BigDecimal.valueOf(50)).build();
        assertThat(sizeResolutionService.recommendSizeHeuristic(body)).isEqualTo("S");
    }

    @Test
    void altSize_returnsAdjacentSize() {
        assertThat(sizeResolutionService.altSize("S")).isEqualTo("M");
    }
}
