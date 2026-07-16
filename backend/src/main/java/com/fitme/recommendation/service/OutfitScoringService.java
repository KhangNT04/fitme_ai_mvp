package com.fitme.recommendation.service;

import com.fitme.common.enums.StockStatus;
import com.fitme.common.util.FitCompatibility;
import com.fitme.common.util.GenderAffinity;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.repository.ProductTagRepository;
import com.fitme.product.service.ProductAudienceService;
import com.fitme.recommendation.service.UserStylingContextService;
import com.fitme.userprofile.entity.BodyProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OutfitScoringService {

    private final ProductTagRepository tagRepository;
    private final ProductAudienceService productAudienceService;
    private final UserStylingContextService userStylingContextService;

    /**
     * Score product for a target style label (server-driven) plus body fit signals.
     * Admin style/occasion rules are no longer applied.
     */
    public double scoreProduct(Product p, String targetStyle, BodyProfile body) {
        return scoreProduct(p, targetStyle, body, null);
    }

    public double scoreProduct(Product p, String targetStyle, BodyProfile body, String userMessage) {
        double score = 0;
        List<ProductTag> tags = tagRepository.findByProductId(p.getId());
        if (targetStyle != null && !targetStyle.isBlank()) {
            for (ProductTag tag : tags) {
                if ("STYLE".equals(tag.getTagType())
                        && tag.getTagValue() != null
                        && tag.getTagValue().equalsIgnoreCase(targetStyle)) {
                    score += 30;
                }
            }
        }
        if (body != null) {
            score += GenderAffinity.scoreBonus(body, productAudienceService.resolveTargetGender(p));
            if (p.getFitType() != null) {
                score += FitCompatibility.scoreBonus(p.getFitType(), body.getFitPreference());
            }
        }
        if (p.getStockStatus() == StockStatus.IN_STOCK) {
            score += 10;
        }
        if (p.isSponsored()) {
            score += 5;
        }
        List<String> tagValues = tags.stream()
                .map(ProductTag::getTagValue)
                .filter(v -> v != null && !v.isBlank())
                .toList();
        score += userStylingContextService.scoreAgeAlignment(
                body,
                userMessage,
                targetStyle,
                tagValues,
                p.getName(),
                p.getCategory());
        return score;
    }

    public boolean withinBudget(Product p, BigDecimal min, BigDecimal max) {
        if (p.getPrice() == null) {
            return true;
        }
        if (min != null && p.getPrice().compareTo(min) < 0) {
            return false;
        }
        if (max != null && p.getPrice().compareTo(max) > 0) {
            return false;
        }
        return true;
    }
}
