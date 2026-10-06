package com.fitme.common.config;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.PurchaseChannel;
import com.fitme.common.util.UrlValidator;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.entity.SizeChart;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class FashionCatalogSyncIntegrationTest extends AbstractIntegrationTest {
    @Autowired FashionCatalogSeeder seeder;
    @Autowired FashionCatalogLoader catalogLoader;
    @Autowired TestDataHelper testData;
    @Autowired ProductRepository products;
    @Autowired ProductVariantRepository variants;
    @Autowired SizeChartRepository sizeCharts;

    @Test
    void refreshKeepsVariantIdsAndIgnoresBrandOwnProducts() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);

        Product catalogProduct = firstCatalogProduct(owner);
        ProductVariant variant = variants.findByProductId(catalogProduct.getId()).getFirst();

        Product ownProduct = testData.createDraftProductForBrand(owner.brand(), "Áo tự đăng " + UUID.randomUUID());
        ownProduct.setStatus(ProductStatus.ACTIVE);
        products.save(ownProduct);

        assertThat(seeder.needsFashionRefresh(owner.brand(), entry)).isFalse();

        seeder.syncBrandCatalog(owner.brand(), entry);

        assertThat(variants.findById(variant.getId())).isPresent();
        assertThat(variants.findByProductId(catalogProduct.getId())).hasSize(variantCountBefore(entry));
        Product ownAfter = products.findById(ownProduct.getId()).orElseThrow();
        assertThat(ownAfter.getStatus()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(ownAfter.getName()).isEqualTo(ownProduct.getName());
        assertThat(seeder.needsFashionRefresh(owner.brand(), entry)).isFalse();
    }

    @Test
    void seededProductsLinkToTheBrandStore() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);

        List<Product> seeded = products.findByBrandId(owner.brand().getId());
        assertThat(seeded).isNotEmpty().allSatisfy(product -> {
            assertThat(product.getPurchaseChannel()).isEqualTo(PurchaseChannel.BRAND_WEBSITE);
            assertThat(UrlValidator.isValidHttpUrl(product.getPurchaseUrl())).isTrue();
            assertThat(product.getPurchaseUrl()).doesNotContain("shopee.vn").contains("/products/");
        });
    }

    @Test
    void syncRewritesLegacyShopeePurchaseUrls() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);
        Product catalogProduct = firstCatalogProduct(owner);
        catalogProduct.setPurchaseUrl("https://shopee.vn/legacy/item");
        catalogProduct.setPurchaseChannel(PurchaseChannel.SHOPEE);
        products.save(catalogProduct);

        seeder.syncBrandCatalog(owner.brand(), entry);

        Product after = products.findById(catalogProduct.getId()).orElseThrow();
        assertThat(after.getPurchaseChannel()).isEqualTo(PurchaseChannel.BRAND_WEBSITE);
        assertThat(after.getPurchaseUrl()).doesNotContain("shopee.vn");
    }

    @Test
    void seededSizeChartsAreGraduatedAndColorsHaveRealHex() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);

        Product catalogProduct = firstCatalogProduct(owner);

        List<SizeChart> charts = sizeCharts.findByProductId(catalogProduct.getId()).stream()
                .sorted(Comparator.comparing(SizeChart::getChestCm))
                .toList();
        assertThat(charts).extracting(SizeChart::getSizeLabel).containsExactly("S", "M", "L", "XL");
        assertThat(charts).extracting(SizeChart::getHeightMinCm).doesNotHaveDuplicates();

        assertThat(variants.findByProductId(catalogProduct.getId()))
                .filteredOn(v -> "Trắng".equals(v.getColorName()))
                .allSatisfy(v -> assertThat(v.getColorHex()).isEqualTo("#FFFFFF"));
    }

    private Product firstCatalogProduct(TestDataHelper.BrandOwnerContext owner) {
        return products.findByBrandId(owner.brand().getId()).stream()
                .min(Comparator.comparing(Product::getCreatedAt))
                .orElseThrow();
    }

    private static int variantCountBefore(FashionCatalogLoader.BrandEntry entry) {
        FashionCatalogLoader.ProductEntry first = entry.products.getFirst();
        int colors = first.colors != null && !first.colors.isEmpty() ? first.colors.size() : 2;
        return 4 * colors;
    }
}
