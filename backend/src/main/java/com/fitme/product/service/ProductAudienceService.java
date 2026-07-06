package com.fitme.product.service;

import com.fitme.common.enums.Gender;
import com.fitme.common.enums.ProductTargetGender;
import com.fitme.common.util.GenderAffinity;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.repository.ProductTagRepository;
import com.fitme.product.util.ProductCategoryGroups;
import com.fitme.userprofile.entity.BodyProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductAudienceService {

    private static final String TARGET_GENDER_TAG = "TARGET_GENDER";

    private final ProductTagRepository tagRepository;

    public ProductTargetGender resolveTargetGender(UUID productId) {
        return resolveTargetGender(productId, null, null);
    }

    public ProductTargetGender resolveTargetGender(Product product) {
        if (product == null) {
            return ProductTargetGender.UNISEX;
        }
        return resolveTargetGender(product.getId(), product.getCategory(), product.getName());
    }

    /** Hard filter for outfit recommendations — incompatible items are excluded, not just down-ranked. */
    public boolean isRecommendableFor(BodyProfile body, Product product) {
        if (body == null || product == null || body.getGender() == null || body.getGender() == Gender.OTHER) {
            return true;
        }
        ProductTargetGender target = resolveTargetGender(product);
        Gender user = body.getGender();
        if (user == Gender.MALE) {
            if (target == ProductTargetGender.FEMALE || isDressProduct(product)) {
                return false;
            }
        }
        if (user == Gender.FEMALE && target == ProductTargetGender.MALE) {
            return false;
        }
        return true;
    }

    public double genderAffinityBonus(Product product, BodyProfile body) {
        return GenderAffinity.scoreBonus(body, resolveTargetGender(product));
    }

    private ProductTargetGender resolveTargetGender(UUID productId, String category, String name) {
        ProductTargetGender fromTag = tagRepository.findByProductId(productId).stream()
                .filter(tag -> TARGET_GENDER_TAG.equals(tag.getTagType()))
                .map(ProductTag::getTagValue)
                .findFirst()
                .map(this::parseTargetGender)
                .orElse(null);
        if (fromTag != null && fromTag != ProductTargetGender.UNISEX) {
            return fromTag;
        }
        ProductTargetGender inferred = inferFromCategoryAndName(category, name);
        return inferred != ProductTargetGender.UNISEX ? inferred : (fromTag != null ? fromTag : ProductTargetGender.UNISEX);
    }

    static ProductTargetGender inferFromCategoryAndName(String category, String name) {
        if (ProductCategoryGroups.DRESSES.equals(ProductCategoryGroups.resolveGroup(category))) {
            return ProductTargetGender.FEMALE;
        }
        String combined = ((category != null ? category : "") + " " + (name != null ? name : ""))
                .toLowerCase(Locale.ROOT);
        if (containsDressKeyword(combined)) {
            return ProductTargetGender.FEMALE;
        }
        return ProductTargetGender.UNISEX;
    }

    static boolean isDressProduct(Product product) {
        if (product == null) {
            return false;
        }
        if (ProductCategoryGroups.DRESSES.equals(ProductCategoryGroups.resolveGroup(product.getCategory()))) {
            return true;
        }
        String combined = ((product.getCategory() != null ? product.getCategory() : "") + " "
                + (product.getName() != null ? product.getName() : "")).toLowerCase(Locale.ROOT);
        return containsDressKeyword(combined);
    }

    private static boolean containsDressKeyword(String value) {
        return value.contains("váy") || value.contains("dress") || value.contains("skirt");
    }

    private ProductTargetGender parseTargetGender(String value) {
        try {
            return ProductTargetGender.valueOf(value);
        } catch (IllegalArgumentException ignored) {
            return ProductTargetGender.UNISEX;
        }
    }
}

