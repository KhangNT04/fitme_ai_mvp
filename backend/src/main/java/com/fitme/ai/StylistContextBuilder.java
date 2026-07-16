package com.fitme.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.ItemRole;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.repository.ProductTagRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.recommendation.dto.CreateRecommendationRequest;
import com.fitme.recommendation.service.OutfitCompositionService;
import com.fitme.recommendation.service.UserStylingContextService;
import com.fitme.product.service.ProductAudienceService;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.wardrobe.entity.WardrobeItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class StylistContextBuilder {

    private final ObjectMapper objectMapper;
    private final FitMeProperties properties;
    private final BrandRepository brandRepository;
    private final ProductTagRepository tagRepository;
    private final ProductVariantRepository variantRepository;
    private final OutfitCompositionService outfitCompositionService;
    private final ProductAudienceService productAudienceService;
    private final UserStylingContextService userStylingContextService;

    public String buildContext(
            BodyProfile body,
            StyleProfile style,
            CreateRecommendationRequest request,
            List<WardrobeItem> wardrobe,
            List<Product> candidates,
            UUID selectedProductId) throws JsonProcessingException {
        Map<String, Object> root = new LinkedHashMap<>();

        Map<String, Object> user = new LinkedHashMap<>();
        user.put("heightCm", body.getHeightCm());
        user.put("weightKg", body.getWeightKg());
        user.put("age", body.getAge());
        user.put("gender", body.getGender() != null ? body.getGender().name() : null);
        user.put("fitPreference", body.getFitPreference() != null ? body.getFitPreference().name() : null);
        user.put("skinTone", body.getSkinTone() != null ? body.getSkinTone().name() : null);
        user.put("chestCm", body.getChestCm());
        user.put("waistCm", body.getWaistCm());
        user.put("hipCm", body.getHipCm());
        user.put("shoulderWidthCm", body.getShoulderWidthCm());
        user.put("goals", body.getGoals());
        root.put("user", user);

        UserStylingContextService.StylingGuidance guidance = userStylingContextService.buildGuidance(
                body,
                request.getUserMessage(),
                request.getStyleLabels());
        Map<String, Object> stylingGuidance = new LinkedHashMap<>();
        stylingGuidance.put("ageBand", guidance.ageBand().name());
        stylingGuidance.put("youthfulLookRequested", guidance.youthfulLookRequested());
        stylingGuidance.put("preferredStyles", guidance.preferredStyles());
        stylingGuidance.put("avoidUnlessRequested", guidance.avoidUnlessRequested());
        stylingGuidance.put("summaryVi", guidance.summaryVi());
        root.put("stylingGuidance", stylingGuidance);

        Map<String, Object> styleMap = new LinkedHashMap<>();
        styleMap.put("targetStyle", style.getPrimaryStyle());
        styleMap.put("primaryStyle", style.getPrimaryStyle());
        root.put("style", styleMap);

        Map<String, Object> req = new LinkedHashMap<>();
        req.put("occasion", request.getOccasion() != null ? request.getOccasion() : "Casual hàng ngày");
        req.put("desiredVibe", request.getDesiredVibe());
        req.put("wardrobeMode", request.getWardrobeMode() != null ? request.getWardrobeMode().name() : null);
        req.put("selectedProductId", selectedProductId != null ? selectedProductId.toString() : null);
        req.put("userMessage", request.getUserMessage());
        if (request.getConversationHistory() != null && !request.getConversationHistory().isEmpty()) {
            req.put("conversationHistory", request.getConversationHistory());
        }
        root.put("request", req);

        List<Map<String, Object>> wardrobeItems = new ArrayList<>();
        for (WardrobeItem item : wardrobe) {
            Map<String, Object> w = new LinkedHashMap<>();
            w.put("id", item.getId() != null ? item.getId().toString() : null);
            w.put("name", item.getName());
            w.put("category", item.getCategory());
            w.put("color", item.getColor());
            wardrobeItems.add(w);
        }
        root.put("wardrobe", wardrobeItems);

        int limit = properties.getAi().getStylistCandidateLimit();
        List<Map<String, Object>> candidateList = new ArrayList<>();
        for (Product product : candidates.stream().limit(limit).toList()) {
            candidateList.add(toCandidate(product));
        }
        root.put("candidates", candidateList);

        return objectMapper.writeValueAsString(root);
    }

    private Map<String, Object> toCandidate(Product product) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", product.getId().toString());
        map.put("name", product.getName());
        map.put("category", product.getCategory());
        ItemRole role = outfitCompositionService.guessRole(product.getCategory());
        map.put("role", role.name());
        map.put("targetGender", productAudienceService.resolveTargetGender(product).name());
        map.put("price", product.getPrice());
        map.put("fitType", product.getFitType() != null ? product.getFitType().name() : null);
        map.put("brandName", brandRepository.findById(product.getBrandId()).map(Brand::getName).orElse(""));
        map.put("description", product.getDescription());

        List<String> tags = tagRepository.findByProductId(product.getId()).stream()
                .map(ProductTag::getTagValue)
                .toList();
        map.put("tags", tags);

        List<ProductVariant> variants = variantRepository.findByProductId(product.getId());
        map.put("colors", variants.stream().map(ProductVariant::getColorName).filter(c -> c != null && !c.isBlank()).distinct().toList());
        map.put("sizes", variants.stream().map(ProductVariant::getSizeLabel).filter(s -> s != null && !s.isBlank()).distinct().toList());
        return map;
    }
}
