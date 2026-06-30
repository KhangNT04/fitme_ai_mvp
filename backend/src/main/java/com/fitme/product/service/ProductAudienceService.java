package com.fitme.product.service;

import com.fitme.common.enums.ProductTargetGender;
import com.fitme.common.util.GenderAffinity;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.repository.ProductTagRepository;
import com.fitme.userprofile.entity.BodyProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductAudienceService {

    private static final String TARGET_GENDER_TAG = "TARGET_GENDER";

    private final ProductTagRepository tagRepository;

    public ProductTargetGender resolveTargetGender(UUID productId) {
        return tagRepository.findByProductId(productId).stream()
                .filter(tag -> TARGET_GENDER_TAG.equals(tag.getTagType()))
                .map(ProductTag::getTagValue)
                .findFirst()
                .map(this::parseTargetGender)
                .orElse(ProductTargetGender.UNISEX);
    }

    public double genderAffinityBonus(Product product, BodyProfile body) {
        return GenderAffinity.scoreBonus(body, resolveTargetGender(product.getId()));
    }

    private ProductTargetGender parseTargetGender(String value) {
        try {
            return ProductTargetGender.valueOf(value);
        } catch (IllegalArgumentException ignored) {
            return ProductTargetGender.UNISEX;
        }
    }
}
