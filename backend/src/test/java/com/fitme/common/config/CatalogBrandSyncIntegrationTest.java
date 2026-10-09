package com.fitme.common.config;

import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.UserRole;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CatalogBrandSyncIntegrationTest extends AbstractIntegrationTest {

    @Autowired CatalogBrandSync catalogBrandSync;
    @Autowired BrandRepository brands;
    @Autowired UserAccountRepository users;
    @Autowired ProductRepository products;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TestDataHelper testData;

    @Test
    void newBrandOwnerAccountsCannotSignInUntilAnAdminHandsThemOver() throws Exception {
        FashionCatalogLoader.BrandEntry entry = entry();

        Brand brand = catalogBrandSync.ensureBrand(entry);

        UserAccount owner = users.findByEmail(entry.ownerEmail).orElseThrow();
        assertThat(brand.getOwnerUserId()).isEqualTo(owner.getId());
        assertThat(brand.getStatus()).isEqualTo(BrandStatus.APPROVED);
        assertThat(brand.getCatalogKey()).isEqualTo(entry.key);
        assertThat(owner.getRole()).isEqualTo(UserRole.BRAND_OWNER);
        assertThat(owner.isEmailVerified()).isTrue();
        for (String guess : List.of("fitme123", "", entry.ownerEmail, "test123")) {
            assertThat(passwordEncoder.matches(guess, owner.getPasswordHash())).isFalse();
        }
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"fitme123\"}".formatted(entry.ownerEmail)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reSyncNeverTouchesAnExistingAccountsPassword() {
        FashionCatalogLoader.BrandEntry entry = entry();
        catalogBrandSync.ensureBrand(entry);
        UserAccount owner = users.findByEmail(entry.ownerEmail).orElseThrow();
        owner.setPasswordHash(passwordEncoder.encode("handed-over-123"));
        users.save(owner);

        catalogBrandSync.ensureBrand(entry);

        UserAccount after = users.findByEmail(entry.ownerEmail).orElseThrow();
        assertThat(passwordEncoder.matches("handed-over-123", after.getPasswordHash())).isTrue();
    }

    @Test
    void brandsAreMatchedByCatalogKeyNotDisplayName() {
        FashionCatalogLoader.BrandEntry entry = entry();
        Brand created = catalogBrandSync.ensureBrand(entry);
        created.setName("Renamed by the brand " + UUID.randomUUID());
        brands.save(created);

        Brand again = catalogBrandSync.ensureBrand(entry);

        assertThat(again.getId()).isEqualTo(created.getId());
        assertThat(brands.findByNameIgnoreCaseOrderByCreatedAtAsc(entry.name)).isEmpty();
    }

    @Test
    void aLegacyBrandWithTheSameNameIsAdoptedOnce() {
        FashionCatalogLoader.BrandEntry entry = entry();
        Brand legacy = testData.createApprovedBrand();
        legacy.setName(entry.name.toUpperCase());
        brands.save(legacy);

        Brand adopted = catalogBrandSync.ensureBrand(entry);

        assertThat(adopted.getId()).isEqualTo(legacy.getId());
        assertThat(adopted.getCatalogKey()).isEqualTo(entry.key);
        assertThat(brands.findByNameIgnoreCaseOrderByCreatedAtAsc(entry.name)).hasSize(1);
    }

    @Test
    void anAdminSuspensionSticksAcrossSyncs() {
        FashionCatalogLoader.BrandEntry entry = entry();
        Brand brand = catalogBrandSync.ensureBrand(entry);
        brand.setStatus(BrandStatus.SUSPENDED);
        brands.save(brand);

        catalogBrandSync.ensureBrand(entry);

        assertThat(brands.findById(brand.getId()).orElseThrow().getStatus()).isEqualTo(BrandStatus.SUSPENDED);
    }

    @Test
    void profileEditsByTheOwnerAreKeptButUneditedProfilesFollowTheCatalog() {
        FashionCatalogLoader.BrandEntry managedEntry = entry();
        Brand managed = catalogBrandSync.ensureBrand(managedEntry);
        managedEntry.description = "Mô tả mới từ catalog";
        catalogBrandSync.ensureBrand(managedEntry);
        assertThat(brands.findById(managed.getId()).orElseThrow().getDescription()).isEqualTo("Mô tả mới từ catalog");

        FashionCatalogLoader.BrandEntry editedEntry = entry();
        Brand edited = catalogBrandSync.ensureBrand(editedEntry);
        edited.setDescription("Brand tự viết");
        edited.setCatalogManaged(false);
        brands.save(edited);
        editedEntry.description = "Catalog muốn ghi đè";
        catalogBrandSync.ensureBrand(editedEntry);
        assertThat(brands.findById(edited.getId()).orElseThrow().getDescription()).isEqualTo("Brand tự viết");
    }

    @Test
    void retiredBrandsAreFoundByKeySuspendedUnownedAndHidden() {
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        Brand brand = owner.brand();
        brand.setCatalogKey("retired-" + UUID.randomUUID());
        brands.save(brand);
        Product product = testData.createEligibleProductForBrand(brand, "Áo cũ", "Áo thun");

        catalogBrandSync.retireBrands(List.of(brand.getCatalogKey(), "missing-" + UUID.randomUUID()));

        Brand after = brands.findById(brand.getId()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(BrandStatus.SUSPENDED);
        assertThat(after.getOwnerUserId()).isNull();
        assertThat(products.findById(product.getId()).orElseThrow().getStatus()).isEqualTo(ProductStatus.INACTIVE);
    }

    private static FashionCatalogLoader.BrandEntry entry() {
        String marker = UUID.randomUUID().toString().substring(0, 8);
        FashionCatalogLoader.BrandEntry entry = new FashionCatalogLoader.BrandEntry();
        entry.key = "test-" + marker;
        entry.name = "Catalog Test " + marker;
        entry.ownerEmail = "catalog-owner-" + marker + "@test.fitme.ai";
        entry.description = "Brand thử nghiệm";
        entry.websiteUrl = "https://example.com/" + marker;
        entry.contactEmail = "contact-" + marker + "@test.fitme.ai";
        entry.products = List.of();
        return entry;
    }
}
