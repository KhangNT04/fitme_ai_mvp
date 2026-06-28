package com.fitme.recommendation.service;

import com.fitme.product.entity.ProductVariant;
import com.fitme.product.entity.SizeChart;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.userprofile.entity.BodyProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SizeResolutionService {

    private final SizeChartRepository sizeChartRepository;
    private final ProductVariantRepository variantRepository;

    public String resolveSize(BodyProfile body, UUID productId) {
        List<SizeChart> charts = sizeChartRepository.findByProductId(productId);
        List<ProductVariant> variants = variantRepository.findByProductId(productId);

        if (!charts.isEmpty()) {
            if (body.getChestCm() != null || body.getWaistCm() != null || body.getHipCm() != null) {
                String best = null;
                double bestDistance = Double.MAX_VALUE;
                for (SizeChart chart : charts) {
                    double distance = 0;
                    int parts = 0;
                    if (body.getChestCm() != null && chart.getChestCm() != null) {
                        distance += Math.abs(body.getChestCm().doubleValue() - chart.getChestCm().doubleValue());
                        parts++;
                    }
                    if (body.getWaistCm() != null && chart.getWaistCm() != null) {
                        distance += Math.abs(body.getWaistCm().doubleValue() - chart.getWaistCm().doubleValue());
                        parts++;
                    }
                    if (body.getHipCm() != null && chart.getHipCm() != null) {
                        distance += Math.abs(body.getHipCm().doubleValue() - chart.getHipCm().doubleValue());
                        parts++;
                    }
                    if (parts > 0 && distance < bestDistance) {
                        bestDistance = distance;
                        best = chart.getSizeLabel();
                    }
                }
                if (best != null) {
                    return best;
                }
            }

            Integer height = body.getHeightCm();
            BigDecimal weight = body.getWeightKg();
            if (height != null || weight != null) {
                for (SizeChart chart : charts) {
                    boolean heightOk = height == null
                            || (chart.getHeightMinCm() != null && chart.getHeightMaxCm() != null
                            && height >= chart.getHeightMinCm() && height <= chart.getHeightMaxCm());
                    boolean weightOk = weight == null
                            || (chart.getWeightMinKg() != null && chart.getWeightMaxKg() != null
                            && weight.compareTo(chart.getWeightMinKg()) >= 0
                            && weight.compareTo(chart.getWeightMaxKg()) <= 0);
                    if (heightOk && weightOk) {
                        return chart.getSizeLabel();
                    }
                }
            }
        }

        return fallbackSize(body, variants);
    }

    public String fallbackSize(BodyProfile body, List<ProductVariant> variants) {
        String heuristic = recommendSizeHeuristic(body);
        boolean hasHeuristic = variants.stream().anyMatch(v -> heuristic.equalsIgnoreCase(v.getSizeLabel()));
        if (hasHeuristic) {
            return heuristic;
        }
        return variants.stream().map(ProductVariant::getSizeLabel).filter(Objects::nonNull).findFirst().orElse("M");
    }

    public String recommendSizeHeuristic(BodyProfile body) {
        if (body.getHeightCm() != null && body.getHeightCm() < 160) return "S";
        if (body.getHeightCm() != null && body.getHeightCm() > 175) return "L";
        return "M";
    }

    public String recommendSize(BodyProfile body, List<RecommendationResponse.OutfitItemDto> items) {
        return items.stream()
                .map(RecommendationResponse.OutfitItemDto::getSelectedSize)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(recommendSizeHeuristic(body));
    }

    public String altSize(String size) {
        return switch (size) {
            case "S" -> "M";
            case "L" -> "M";
            default -> "L";
        };
    }
}
