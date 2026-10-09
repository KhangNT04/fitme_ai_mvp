package com.fitme.common.config;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.PurchaseChannel;
import com.fitme.common.util.UrlValidator;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.entity.SizeChart;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FashionCatalogSyncIntegrationTest extends AbstractIntegrationTest {
    @Autowired FashionCatalogSeeder seeder;
    @Autowired FashionCatalogLoader catalogLoader;
    @Autowired TestDataHelper testData;
    @Autowired ProductRepository products;
    @Autowired ProductVariantRepository variants;
    @Autowired SizeChartRepository sizeCharts;
    @Autowired ProductImageRepository images;
    @Autowired JdbcTemplate jdbc;

    @Test
    void refreshKeepsVariantIdsAndIgnoresBrandOwnProducts() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);

        Product catalogProduct = firstCatalogProduct(owner);
        ProductVariant variant = variants.findByProductId(catalogProduct.getId()).getFirst();
        markCatalogEntryChanged(catalogProduct);

        Product ownProduct = testData.createDraftProductForBrand(owner.brand(), "Áo tự đăng " + UUID.randomUUID());
        ownProduct.setStatus(ProductStatus.ACTIVE);
        products.save(ownProduct);

        seeder.syncBrandCatalog(owner.brand(), entry);

        assertThat(variants.findById(variant.getId())).isPresent();
        assertThat(variants.findByProductId(catalogProduct.getId())).hasSize(variantCountBefore(entry));
        Product ownAfter = products.findById(ownProduct.getId()).orElseThrow();
        assertThat(ownAfter.getStatus()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(ownAfter.getName()).isEqualTo(ownProduct.getName());
        assertThat(products.findByBrandId(owner.brand().getId())).hasSize(entry.products.size() + 1);
    }

    @Test
    void seededProductsLinkToTheirShopeeListing() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);

        List<Product> seeded = products.findByBrandId(owner.brand().getId());
        assertThat(seeded).hasSize(entry.products.size()).allSatisfy(product -> {
            assertThat(product.getPurchaseChannel()).isEqualTo(PurchaseChannel.SHOPEE);
            assertThat(UrlValidator.isValidHttpUrl(product.getPurchaseUrl())).isTrue();
            assertThat(product.getPurchaseUrl()).startsWith("https://shopee.vn/product/");
            assertThat(product.getPurchaseUrl()).endsWith("/" + product.getCatalogItemId());
            assertThat(product.isCatalogManaged()).isTrue();
            assertThat(product.getCatalogHash()).hasSize(64);
        });
    }

    @Test
    void changedCatalogEntriesAreReappliedButUnchangedOnesAreLeftAlone() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);
        Product catalogProduct = firstCatalogProduct(owner);
        catalogProduct.setPurchaseUrl("https://example.com/legacy/item");
        catalogProduct.setPurchaseChannel(PurchaseChannel.BRAND_WEBSITE);
        products.save(catalogProduct);

        seeder.syncBrandCatalog(owner.brand(), entry);
        assertThat(products.findById(catalogProduct.getId()).orElseThrow().getPurchaseUrl())
                .isEqualTo("https://example.com/legacy/item");

        markCatalogEntryChanged(products.findById(catalogProduct.getId()).orElseThrow());
        seeder.syncBrandCatalog(owner.brand(), entry);

        Product after = products.findById(catalogProduct.getId()).orElseThrow();
        assertThat(after.getPurchaseChannel()).isEqualTo(PurchaseChannel.SHOPEE);
        assertThat(after.getPurchaseUrl()).isEqualTo(entry.products.getFirst().purchaseUrl);
    }

    @Test
    void brandEditedProductsAreNeverOverwritten() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);
        Product edited = firstCatalogProduct(owner);
        edited.setName("Tên brand tự đặt");
        edited.setCatalogManaged(false);
        edited.setCatalogHash("outdated");
        products.save(edited);

        seeder.syncBrandCatalog(owner.brand(), entry);

        Product after = products.findById(edited.getId()).orElseThrow();
        assertThat(after.getName()).isEqualTo("Tên brand tự đặt");
        assertThat(after.getCatalogHash()).isEqualTo("outdated");
    }

    @Test
    void hiddenRejectedOrFlaggedProductsStayThatWayAcrossSyncs() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);
        List<Product> seeded = products.findByBrandId(owner.brand().getId()).stream()
                .sorted(Comparator.comparing(Product::getCreatedAt))
                .toList();
        List<ProductStatus> moderated = List.of(ProductStatus.INACTIVE, ProductStatus.REJECTED, ProductStatus.FLAGGED);
        for (int i = 0; i < moderated.size(); i++) {
            Product product = seeded.get(i);
            product.setStatus(moderated.get(i));
            markCatalogEntryChanged(product);
        }

        seeder.syncBrandCatalog(owner.brand(), entry);

        for (int i = 0; i < moderated.size(); i++) {
            Product after = products.findById(seeded.get(i).getId()).orElseThrow();
            assertThat(after.getStatus()).isEqualTo(moderated.get(i));
            assertThat(after.getCatalogHash()).isNotEqualTo("outdated");
        }
    }

    @Test
    void legacyRowsAreLinkedToItemIdsOnceInCatalogOrder() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);
        List<UUID> idsInCatalogOrder = new java.util.ArrayList<>();
        for (int i = 0; i < entry.products.size(); i++) {
            String itemId = entry.products.get(i).itemId;
            Product product = products.findByBrandId(owner.brand().getId()).stream()
                    .filter(p -> itemId.equals(p.getCatalogItemId()))
                    .findFirst()
                    .orElseThrow();
            idsInCatalogOrder.add(product.getId());
            jdbc.update("""
                    UPDATE products SET catalog_item_id = NULL, catalog_hash = NULL,
                           created_at = TIMESTAMPTZ '2020-01-01 00:00:00+00' + (? * INTERVAL '1 minute')
                    WHERE id = ?""", i, product.getId());
        }

        seeder.syncBrandCatalog(owner.brand(), entry);

        assertThat(products.findByBrandId(owner.brand().getId())).hasSize(entry.products.size());
        for (int i = 0; i < idsInCatalogOrder.size(); i++) {
            assertThat(products.findById(idsInCatalogOrder.get(i)).orElseThrow().getCatalogItemId())
                    .isEqualTo(entry.products.get(i).itemId);
        }
    }

    @Test
    void productsDroppedFromTheCatalogAreHidden() {
        FashionCatalogLoader.BrandEntry full = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), full);
        FashionCatalogLoader.BrandEntry trimmed = copyWithoutLastProduct(full);
        String droppedItemId = full.products.getLast().itemId;

        seeder.syncBrandCatalog(owner.brand(), trimmed);

        assertThat(products.findByBrandId(owner.brand().getId()))
                .allSatisfy(p -> assertThat(p.getStatus()).isEqualTo(
                        droppedItemId.equals(p.getCatalogItemId()) ? ProductStatus.INACTIVE : ProductStatus.ACTIVE));
    }

    @Test
    void brandChosenTryOnImageIsTheOnlyTryOnImage() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);

        Product catalogProduct = firstCatalogProduct(owner);
        FashionCatalogLoader.ProductEntry first = entry.products.getFirst();
        List<ProductImage> gallery = images.findByProductIdOrderBySortOrderAsc(catalogProduct.getId());

        assertThat(gallery).hasSize(first.images.size());
        assertThat(gallery).filteredOn(img -> ProductImage.TYPE_TRY_ON.equals(img.getImageType()))
                .extracting(ProductImage::getImageUrl)
                .containsExactly(first.tryOnImage);
        assertThat(catalogProduct.isAiTryOnEligible()).isTrue();

        Product accessory = products.findByBrandId(owner.brand().getId()).stream()
                .filter(p -> "Phụ kiện".equals(p.getCategory()))
                .findFirst()
                .orElseThrow();
        assertThat(accessory.isAiTryOnEligible()).isFalse();
        assertThat(images.findByProductIdOrderBySortOrderAsc(accessory.getId()))
                .noneMatch(img -> ProductImage.TYPE_TRY_ON.equals(img.getImageType()));
    }

    @Test
    void theDatabaseRejectsASecondTryOnImage() {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);
        Product catalogProduct = firstCatalogProduct(owner);

        assertThatThrownBy(() -> images.saveAndFlush(ProductImage.builder()
                .productId(catalogProduct.getId())
                .imageUrl("https://cdn.test/second-try-on.jpg")
                .imageType(ProductImage.TYPE_TRY_ON)
                .sortOrder(99)
                .build()))
                .isInstanceOf(DataIntegrityViolationException.class);
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
        assertThat(charts).extracting(SizeChart::getSizeLabel)
                .containsExactlyElementsOf(entry.products.getFirst().sizes);
        assertThat(charts).extracting(SizeChart::getHeightMinCm).doesNotHaveDuplicates();

        assertThat(variants.findByProductId(catalogProduct.getId()))
                .filteredOn(v -> "Trắng".equals(v.getColorName()))
                .allSatisfy(v -> assertThat(v.getColorHex()).isEqualTo("#FFFFFF"));
    }

    /** Simulates a new catalog version for this product (its stored hash no longer matches the entry). */
    private void markCatalogEntryChanged(Product product) {
        product.setCatalogHash("outdated");
        products.save(product);
    }

    private static FashionCatalogLoader.BrandEntry copyWithoutLastProduct(FashionCatalogLoader.BrandEntry source) {
        FashionCatalogLoader.BrandEntry copy = new FashionCatalogLoader.BrandEntry();
        copy.key = source.key;
        copy.name = source.name;
        copy.products = source.products.subList(0, source.products.size() - 1);
        return copy;
    }

    private Product firstCatalogProduct(TestDataHelper.BrandOwnerContext owner) {
        String firstItemId = catalogLoader.load().brands.getFirst().products.getFirst().itemId;
        return products.findByBrandId(owner.brand().getId()).stream()
                .filter(p -> firstItemId.equals(p.getCatalogItemId()))
                .findFirst()
                .orElseThrow();
    }

    private static int variantCountBefore(FashionCatalogLoader.BrandEntry entry) {
        FashionCatalogLoader.ProductEntry first = entry.products.getFirst();
        int colors = first.colors != null && !first.colors.isEmpty() ? first.colors.size() : 2;
        int sizes = first.sizes != null && !first.sizes.isEmpty() ? first.sizes.size() : 4;
        return sizes * colors;
    }
}
