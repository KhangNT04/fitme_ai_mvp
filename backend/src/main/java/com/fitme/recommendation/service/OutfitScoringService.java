package com.fitme.recommendation.service;

import com.fitme.common.enums.OutfitCoherenceMode;
import com.fitme.common.enums.StockStatus;
import com.fitme.common.util.FitCompatibility;
import com.fitme.common.util.GenderAffinity;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.repository.ProductTagRepository;
import com.fitme.product.service.ProductAudienceService;
import com.fitme.userprofile.entity.BodyProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

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
        return scoreProduct(p, targetStyle, body, null, OutfitScoreContext.empty());
    }

    public double scoreProduct(Product p, String targetStyle, BodyProfile body, String userMessage) {
        return scoreProduct(p, targetStyle, body, userMessage, OutfitScoreContext.empty());
    }

    public double scoreProduct(
            Product p,
            String targetStyle,
            BodyProfile body,
            String userMessage,
            OutfitScoreContext ctx) {
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

        score += preferenceAndCoherenceBonus(p, targetStyle, ctx);
        return score;
    }

    /**
     * Soft brand coherence + learned affinity. Free (OFF) skips coherence bonuses so looks mix;
     * Plus (PREFER/STRICT) boosts same-brand / partner and applies preferenceScale for deeper personalization.
     */
    double preferenceAndCoherenceBonus(Product p, String targetStyle, OutfitScoreContext ctx) {
        if (ctx == null) {
            return 0;
        }
        double bonus = 0;
        double scale = ctx.preferenceScale();

        if (targetStyle != null && !targetStyle.isBlank()) {
            bonus += 8.0 * scale * ctx.styleWeights().getOrDefault(targetStyle, 0.0);
        }
        if (p.getBrandId() != null) {
            bonus += 12.0 * scale * ctx.brandWeights().getOrDefault(p.getBrandId().toString(), 0.0);
        }
        if (p.getId() != null && !ctx.colorWeights().isEmpty()) {
            // Color affinity is applied lightly; actual colors live on variants — skip here.
        }

        OutfitCoherenceMode mode = ctx.coherenceMode() != null
                ? ctx.coherenceMode()
                : OutfitCoherenceMode.OFF;
        UUID preferred = ctx.preferredBrandId();
        if (mode == OutfitCoherenceMode.OFF || preferred == null || p.getBrandId() == null) {
            return bonus;
        }

        if (preferred.equals(p.getBrandId())) {
            bonus += mode == OutfitCoherenceMode.STRICT ? 35 : 22;
        } else if (ctx.partnerBrandIds().contains(p.getBrandId())) {
            bonus += mode == OutfitCoherenceMode.STRICT ? 25 : 12;
        } else if (mode == OutfitCoherenceMode.PREFER) {
            bonus -= 4;
        } else if (mode == OutfitCoherenceMode.STRICT) {
            bonus -= 40;
        }
        return bonus;
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

    /** STRICT mode: keep same-brand / partner candidates when preferred brand is known. */
    public boolean matchesCoherenceFilter(Product p, OutfitScoreContext ctx) {
        if (ctx == null || ctx.coherenceMode() != OutfitCoherenceMode.STRICT) {
            return true;
        }
        if (ctx.preferredBrandId() == null || p.getBrandId() == null) {
            return true;
        }
        return ctx.preferredBrandId().equals(p.getBrandId())
                || ctx.partnerBrandIds().contains(p.getBrandId());
    }
}
