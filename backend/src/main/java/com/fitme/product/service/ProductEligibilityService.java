package com.fitme.product.service;

import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.StockStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.repository.ProductTagRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.fitme.common.util.UrlValidator;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductEligibilityService {

    private final ProductImageRepository imageRepository;
    private final ProductVariantRepository variantRepository;
    private final SizeChartRepository sizeChartRepository;

    public boolean canBeListed(Product product) {
        return product.getStatus() == ProductStatus.ACTIVE
                && product.getCategory() != null && !product.getCategory().isBlank();
    }

    public boolean canBeRecommended(Product product) {
        if (!canBeListed(product)) {
            return false;
        }
        if (product.getStockStatus() == StockStatus.OUT_OF_STOCK) {
            return false;
        }
        return !imageRepository.findByProductIdOrderBySortOrderAsc(product.getId()).isEmpty();
    }

    public boolean canShowBuyButton(Product product) {
        if (!canBeRecommended(product)) {
            return false;
        }
        return UrlValidator.isValidHttpUrl(product.getPurchaseUrl());
    }

    public boolean canBeUsedForAiTryOn(Product product) {
        if (!canShowBuyButton(product)) {
            return false;
        }
        UUID productId = product.getId();
        boolean hasImage = !imageRepository.findByProductIdOrderBySortOrderAsc(productId).isEmpty();
        boolean hasSize = !variantRepository.findByProductId(productId).isEmpty()
                || !sizeChartRepository.findByProductId(productId).isEmpty();
        boolean hasColor = variantRepository.findByProductId(productId).stream()
                .anyMatch(v -> v.getColorName() != null && !v.getColorName().isBlank());
        return hasImage && hasSize && hasColor && product.isAiTryOnEligible();
    }

    public java.util.List<String> getModerationIssues(UUID productId) {
        java.util.List<String> issues = new java.util.ArrayList<>();
        if (imageRepository.findByProductIdOrderBySortOrderAsc(productId).isEmpty()) {
            issues.add("Thiếu ảnh sản phẩm");
        }
        boolean hasVariants = !variantRepository.findByProductId(productId).isEmpty();
        boolean hasCharts = !sizeChartRepository.findByProductId(productId).isEmpty();
        if (!hasVariants) {
            issues.add("Thiếu biến thể màu/size");
        }
        if (!hasCharts) {
            issues.add("Thiếu bảng size");
        }
        return issues;
    }
}
