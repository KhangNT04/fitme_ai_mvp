package com.fitme.recommendation.service;

import com.fitme.admin.entity.OccasionRule;
import com.fitme.admin.entity.StyleRule;
import com.fitme.admin.repository.OccasionRuleRepository;
import com.fitme.admin.repository.StyleRuleRepository;
import com.fitme.common.enums.StockStatus;
import com.fitme.common.util.FitCompatibility;
import com.fitme.common.util.GenderAffinity;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.repository.ProductTagRepository;
import com.fitme.product.service.ProductAudienceService;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OutfitScoringService {

    private final ProductTagRepository tagRepository;
    private final StyleRuleRepository styleRuleRepository;
    private final OccasionRuleRepository occasionRuleRepository;
    private final ProductAudienceService productAudienceService;

    public double scoreProduct(Product p, StyleProfile style, String occasion, BodyProfile body) {
        double score = 0;
        List<ProductTag> tags = tagRepository.findByProductId(p.getId());
        for (ProductTag tag : tags) {
            if ("STYLE".equals(tag.getTagType()) && tag.getTagValue().equalsIgnoreCase(style.getPrimaryStyle())) {
                score += 30;
            }
            if ("OCCASION".equals(tag.getTagType()) && occasion.toLowerCase().contains(tag.getTagValue().toLowerCase())) {
                score += 25;
            }
        }
        score += scoreFromStyleRules(style, tags);
        score += scoreFromOccasionRules(occasion, tags);
        if (body != null) {
            score += GenderAffinity.scoreBonus(body, productAudienceService.resolveTargetGender(p));
            if (p.getFitType() != null) {
                score += FitCompatibility.scoreBonus(p.getFitType(), body.getFitPreference());
            }
        }
        if (p.getStockStatus() == StockStatus.IN_STOCK) score += 10;
        if (p.isSponsored()) score += 5;
        return score;
    }

    public double scoreFromStyleRules(StyleProfile style, List<ProductTag> tags) {
        double bonus = 0;
        for (StyleRule rule : styleRuleRepository.findByActiveTrue()) {
            if (rule.getKeywords() == null) continue;
            boolean styleMatch = rule.getKeywords().stream()
                    .anyMatch(k -> style.getPrimaryStyle() != null
                            && style.getPrimaryStyle().toLowerCase().contains(k.toLowerCase()));
            boolean tagMatch = tags.stream().anyMatch(t ->
                    rule.getKeywords().stream().anyMatch(k ->
                            t.getTagValue() != null && t.getTagValue().toLowerCase().contains(k.toLowerCase())));
            if (styleMatch || tagMatch) bonus += 10;
        }
        return bonus;
    }

    public double scoreFromOccasionRules(String occasion, List<ProductTag> tags) {
        double bonus = 0;
        String occ = occasion != null ? occasion.toLowerCase() : "";
        for (OccasionRule rule : occasionRuleRepository.findByActiveTrue()) {
            if (rule.getKeywords() == null) continue;
            boolean occasionMatch = rule.getKeywords().stream()
                    .anyMatch(k -> occ.contains(k.toLowerCase()) || rule.getName().toLowerCase().contains(k.toLowerCase()));
            boolean tagMatch = tags.stream().anyMatch(t ->
                    rule.getKeywords().stream().anyMatch(k ->
                            t.getTagValue() != null && t.getTagValue().toLowerCase().contains(k.toLowerCase())));
            if (occasionMatch || tagMatch) bonus += 10;
        }
        return bonus;
    }

    public boolean withinBudget(Product p, BigDecimal min, BigDecimal max) {
        if (p.getPrice() == null) return true;
        if (min != null && p.getPrice().compareTo(min) < 0) return false;
        if (max != null && p.getPrice().compareTo(max) > 0) return false;
        return true;
    }
}
