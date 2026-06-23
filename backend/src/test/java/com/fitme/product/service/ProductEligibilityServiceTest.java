package com.fitme.product.service;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.StockStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductEligibilityServiceTest {

    @Mock
    private ProductImageRepository imageRepository;

    @Mock
    private ProductVariantRepository variantRepository;

    @Mock
    private SizeChartRepository sizeChartRepository;

    @InjectMocks
    private ProductEligibilityService eligibilityService;

    private Product activeProduct;
    private UUID productId;

    @BeforeEach
    void setUp() {
        productId = UUID.randomUUID();
        activeProduct = Product.builder()
                .id(productId)
                .brandId(UUID.randomUUID())
                .name("Test Product")
                .category("Áo thun")
                .status(ProductStatus.ACTIVE)
                .stockStatus(StockStatus.IN_STOCK)
                .purchaseUrl("https://shopee.vn/product-1")
                .fitType(FitPreference.REGULAR)
                .build();
    }

    @Test
    void canShowBuyButton_whenProductEligibleAndValidUrl_returnsTrue() {
        when(imageRepository.findByProductIdOrderBySortOrderAsc(productId))
                .thenReturn(List.of(ProductImage.builder().productId(productId).imageUrl("https://example.com/img.jpg").build()));

        assertTrue(eligibilityService.canShowBuyButton(activeProduct));
    }

    @Test
    void canShowBuyButton_whenUnsafeUrl_returnsFalse() {
        activeProduct.setPurchaseUrl("javascript:alert(1)");
        when(imageRepository.findByProductIdOrderBySortOrderAsc(productId))
                .thenReturn(List.of(ProductImage.builder().productId(productId).imageUrl("https://example.com/img.jpg").build()));

        assertFalse(eligibilityService.canShowBuyButton(activeProduct));
    }

    @Test
    void canShowBuyButton_whenMissingImages_returnsFalse() {
        activeProduct.setPurchaseUrl("https://shopee.vn/product-1");
        when(imageRepository.findByProductIdOrderBySortOrderAsc(productId)).thenReturn(List.of());

        assertFalse(eligibilityService.canShowBuyButton(activeProduct));
    }

    @Test
    void canShowBuyButton_whenOutOfStock_returnsFalse() {
        activeProduct.setStockStatus(StockStatus.OUT_OF_STOCK);

        assertFalse(eligibilityService.canShowBuyButton(activeProduct));
    }

    @Test
    void canShowBuyButton_whenDataUrl_returnsFalse() {
        activeProduct.setPurchaseUrl("data:text/html,<script>alert(1)</script>");
        when(imageRepository.findByProductIdOrderBySortOrderAsc(productId))
                .thenReturn(List.of(ProductImage.builder().productId(productId).imageUrl("https://example.com/img.jpg").build()));

        assertFalse(eligibilityService.canShowBuyButton(activeProduct));
    }
}
