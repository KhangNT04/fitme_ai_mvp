package com.fitme.product.service;

import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.StockStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import com.fitme.common.util.UrlValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
        if (!canBeListed(product)) {
            return false;
        }
        if (product.getStockStatus() == StockStatus.OUT_OF_STOCK) {
            return false;
        }
        if (imageRepository.findByProductIdOrderBySortOrderAsc(product.getId()).isEmpty()) {
            return false;
        }
        return UrlValidator.isValidHttpUrl(product.getPurchaseUrl());
    }

    public boolean meetsProductMetadataForTryOn(Product product) {
        if (!canShowBuyButton(product)) {
            return false;
        }
        UUID productId = product.getId();
        boolean hasSize = !variantRepository.findByProductId(productId).isEmpty()
                || !sizeChartRepository.findByProductId(productId).isEmpty();
        boolean hasColor = variantRepository.findByProductId(productId).stream()
                .anyMatch(v -> v.getColorName() != null && !v.getColorName().isBlank());
        return hasTryOnImage(productId) && hasSize && hasColor;
    }

    /** The brand must pick which gallery image the AI renders; product shots alone are not enough. */
    public boolean hasTryOnImage(UUID productId) {
        return imageRepository.findByProductIdOrderBySortOrderAsc(productId).stream()
                .anyMatch(img -> ProductImage.TYPE_TRY_ON.equalsIgnoreCase(img.getImageType()));
    }

    /** Shoes and accessories are skipped by the VTON garment mapping, so they never need a try-on image. */
    private static boolean isOutsideVtonScope(Product product) {
        return isOutsideVtonScope(product.getCategory());
    }

    public static boolean isOutsideVtonScope(String category) {
        String value = category != null ? category.trim() : "";
        return value.equalsIgnoreCase("Phụ kiện") || value.equalsIgnoreCase("Giày");
    }

    /** AI try-on is paid by the consumer in Fitken, so only product metadata matters here. */
    public boolean canBeUsedForAiTryOn(Product product) {
        return !isOutsideVtonScope(product) && meetsProductMetadataForTryOn(product);
    }

    static final String MISSING_IMAGE_ISSUE = "Thiếu ảnh sản phẩm";
    static final String MISSING_PURCHASE_URL_ISSUE = "Thiếu link mua hàng hợp lệ";
    static final String MISSING_TRY_ON_IMAGE_ISSUE = "Chưa chọn ảnh thử đồ AI";

    /** Issues that stop an admin from approving: shoppers need a photo and a working link to the brand's store. */
    public static boolean isBlockingModerationIssue(String issue) {
        return MISSING_IMAGE_ISSUE.equals(issue) || MISSING_PURCHASE_URL_ISSUE.equals(issue);
    }

    public java.util.List<String> getModerationIssues(Product product) {
        UUID productId = product.getId();
        java.util.List<String> issues = new java.util.ArrayList<>();
        if (imageRepository.findByProductIdOrderBySortOrderAsc(productId).isEmpty()) {
            issues.add(MISSING_IMAGE_ISSUE);
        } else if (!isOutsideVtonScope(product) && !hasTryOnImage(productId)) {
            issues.add(MISSING_TRY_ON_IMAGE_ISSUE);
        }
        if (!UrlValidator.isValidHttpUrl(product.getPurchaseUrl())) {
            issues.add(MISSING_PURCHASE_URL_ISSUE);
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
