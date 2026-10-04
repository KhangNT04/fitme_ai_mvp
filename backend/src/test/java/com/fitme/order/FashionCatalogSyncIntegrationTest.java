package com.fitme.order;

import com.fitme.common.config.FashionCatalogLoader;
import com.fitme.common.config.FashionCatalogSeeder;
import com.fitme.common.enums.ProductStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductVariant;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Comparator;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class FashionCatalogSyncIntegrationTest extends CommerceIntegrationSupport {
    @Autowired FashionCatalogSeeder seeder;
    @Autowired FashionCatalogLoader catalogLoader;

    @Test
    void refreshKeepsOrderedVariantsAndIgnoresBrandOwnProducts() throws Exception {
        FashionCatalogLoader.BrandEntry entry = catalogLoader.load().brands.getFirst();
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        seeder.seedBrandCatalog(owner.brand(), entry);

        Product catalogProduct = products.findByBrandId(owner.brand().getId()).stream()
                .min(Comparator.comparing(Product::getCreatedAt))
                .orElseThrow();
        ProductVariant ordered = variants.findByProductId(catalogProduct.getId()).getFirst();
        ordered.setStockQuantity(7);
        variants.save(ordered);

        String token = registerUserAccessToken();
        UUID addressId = createAddress(token);
        addToCart(token, new ProductFixture(owner, catalogProduct, ordered), 2);
        placeOrder(token, addressId, "COD", null);

        Product ownProduct = testData.createDraftProductForBrand(owner.brand(), "Áo tự đăng " + UUID.randomUUID());
        ownProduct.setStatus(ProductStatus.ACTIVE);
        products.save(ownProduct);

        assertThat(seeder.needsFashionRefresh(owner.brand(), entry)).isFalse();

        seeder.syncBrandCatalog(owner.brand(), entry);

        ProductVariant afterSync = variants.findById(ordered.getId()).orElseThrow();
        assertThat(afterSync.getStockQuantity()).isEqualTo(5);
        assertThat(variants.findByProductId(catalogProduct.getId())).hasSize(variantCountBefore(entry));
        Product ownAfter = products.findById(ownProduct.getId()).orElseThrow();
        assertThat(ownAfter.getStatus()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(ownAfter.getName()).isEqualTo(ownProduct.getName());
        assertThat(seeder.needsFashionRefresh(owner.brand(), entry)).isFalse();
    }

    private static int variantCountBefore(FashionCatalogLoader.BrandEntry entry) {
        FashionCatalogLoader.ProductEntry first = entry.products.getFirst();
        int colors = first.colors != null && !first.colors.isEmpty() ? first.colors.size() : 2;
        return 4 * colors;
    }
}
