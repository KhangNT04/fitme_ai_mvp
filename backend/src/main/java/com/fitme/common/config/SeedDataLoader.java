package com.fitme.common.config;

import com.fitme.admin.entity.OccasionRule;
import com.fitme.admin.entity.StyleRule;
import com.fitme.admin.repository.OccasionRuleRepository;
import com.fitme.admin.repository.StyleRuleRepository;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.billing.service.ConsumerSubscriptionService;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.*;
import com.fitme.fitken.service.FitkenService;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.redirect.entity.FlaggedLink;
import com.fitme.redirect.repository.FlaggedLinkRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class SeedDataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);
    private static final String LEGACY_DEMO_PREFIX = "Sản phẩm demo ";

    private final UserAccountRepository userRepository;
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final FlaggedLinkRepository flaggedLinkRepository;
    private final StyleRuleRepository styleRuleRepository;
    private final OccasionRuleRepository occasionRuleRepository;
    private final PasswordEncoder passwordEncoder;
    private final FashionCatalogLoader fashionCatalogLoader;
    private final FashionCatalogSeeder fashionCatalogSeeder;
    private final FitkenService fitkenService;
    private final ConsumerSubscriptionService consumerSubscriptionService;
    private final CatalogBrandSync catalogBrandSync;

    @Value("${fitme.seed.admin-email:admin@fitme.ai}")
    private String adminEmail;

    @Value("${fitme.seed.brand-email:brand@fitme.ai}")
    private String brandEmail;

    @Value("${fitme.seed.user-email:user@fitme.ai}")
    private String userEmail;

    /** Demo consumer with an active FitMe Premium period (wardrobe, brand preferences). */
    @Value("${fitme.seed.premium-email:premium@fitme.ai}")
    private String premiumEmail;

    /** No default: without FITME_SEED_PASSWORD the seeded demo accounts get a random, unusable password. */
    @Value("${fitme.seed.password:}")
    private String seedPassword;

    @Value("${fitme.seed.enabled:true}")
    private boolean seedEnabled;

    @Value("${fitme.seed.top-up-enabled:true}")
    private boolean topUpEnabled;

    @Value("${fitme.seed.fashion-catalog-refresh:true}")
    private boolean fashionCatalogRefresh;

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            if (fashionCatalogRefresh) {
                log.info("FitMe seed disabled; running fashion catalog refresh only");
                refreshFashionCatalogData();
            } else {
                log.info("FitMe seed disabled (fitme.seed.enabled=false)");
            }
            return;
        }

        if (userRepository.count() == 0) {
            seedFreshDatabase();
            return;
        }

        if (topUpEnabled) {
            refreshFashionCatalogData();
        }
    }

    private void seedFreshDatabase() {
        log.info("Seeding FitMe fashion catalog (fresh database)...");
        String demoPasswordHash = seedPasswordHash();

        userRepository.save(UserAccount.builder()
                .email(adminEmail)
                .passwordHash(demoPasswordHash)
                .displayName("FitMe Admin")
                .role(UserRole.ADMIN)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());

        // Brand owner without a brand: demo account for the "apply as a new brand" flow.
        userRepository.save(UserAccount.builder()
                .email(brandEmail)
                .passwordHash(demoPasswordHash)
                .displayName("FitMe Editorial")
                .role(UserRole.BRAND_OWNER)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());

        UserAccount demoUser = userRepository.save(UserAccount.builder()
                .email(userEmail)
                .passwordHash(demoPasswordHash)
                .displayName("Minh Anh")
                .role(UserRole.USER)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());
        fitkenService.adminAdjust(demoUser.getId(), 20, "Fitken demo cho tài khoản mẫu");

        UserAccount premiumUser = userRepository.save(UserAccount.builder()
                .email(premiumEmail)
                .passwordHash(demoPasswordHash)
                .displayName("Bảo Ngọc")
                .role(UserRole.USER)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());
        consumerSubscriptionService.adminGrantPremium(premiumUser.getId(), null);

        int totalProducts = 0;
        for (FashionCatalogLoader.BrandEntry entry : fashionCatalogLoader.load().brands) {
            Brand brand = ensureApprovedBrand(entry);
            totalProducts += fashionCatalogSeeder.seedBrandCatalog(brand, entry);
        }

        seedRulesIfEmpty();
        seedFlaggedLinksIfEmpty();

        log.info(
                "Seed complete: {} fashion products across {} brands. Admin: {}",
                totalProducts,
                fashionCatalogLoader.load().brands.size(),
                adminEmail);
    }

    /** Refresh fashion catalog on existing DB (local, staging, or prod with seed off). */
    private void refreshFashionCatalogData() {
        retireDemoBrands();
        deactivateOrphanLegacyDemoProducts();
        ensureFashionBrandsExist();

        if (fashionCatalogRefresh) {
            refreshFashionCatalog();
        }

        seedRulesIfEmpty();
        seedFlaggedLinksIfEmpty();

        int activeCount = productRepository.findByStatus(ProductStatus.ACTIVE).size();
        log.info("Catalog status: {} active products", activeCount);
    }

    private void retireDemoBrands() {
        catalogBrandSync.retireBrands(fashionCatalogLoader.load().retiredBrands);
    }

    private void deactivateOrphanLegacyDemoProducts() {
        List<Product> legacy = productRepository.findByNameStartingWith(LEGACY_DEMO_PREFIX);
        FashionCatalogLoader.FashionCatalog catalog = fashionCatalogLoader.load();
        var fashionBrandIds = catalog.brands.stream()
                .map(entry -> brandRepository.findByCatalogKey(entry.key).map(Brand::getId))
                .flatMap(Optional::stream)
                .collect(java.util.stream.Collectors.toSet());

        int deactivated = 0;
        for (Product product : legacy) {
            if (fashionBrandIds.contains(product.getBrandId())) {
                continue;
            }
            product.setStatus(ProductStatus.INACTIVE);
            productRepository.save(product);
            deactivated++;
        }
        if (deactivated > 0) {
            log.info("Deactivated {} orphan legacy demo products outside fashion brands", deactivated);
        }
    }

    private void refreshFashionCatalog() {
        for (FashionCatalogLoader.BrandEntry entry : fashionCatalogLoader.load().brands) {
            fashionCatalogSeeder.syncBrandCatalog(ensureApprovedBrand(entry), entry);
        }
    }

    private void ensureFashionBrandsExist() {
        for (FashionCatalogLoader.BrandEntry entry : fashionCatalogLoader.load().brands) {
            ensureApprovedBrand(entry);
        }
    }

    private Brand ensureApprovedBrand(FashionCatalogLoader.BrandEntry entry) {
        return catalogBrandSync.ensureBrand(entry);
    }

    private String seedPasswordHash() {
        if (seedPassword == null || seedPassword.isBlank()) {
            log.warn("FITME_SEED_PASSWORD is not set: seeded demo accounts get a random password and need a reset");
            return CatalogBrandSync.unusablePasswordHash(passwordEncoder);
        }
        return passwordEncoder.encode(seedPassword);
    }

    private void seedRulesIfEmpty() {
        if (styleRuleRepository.count() == 0) {
            styleRuleRepository.save(StyleRule.builder()
                    .name("Korean Casual")
                    .description("Phong cách Hàn Quốc nhẹ nhàng, layer thoải mái")
                    .keywords(List.of("korean", "casual", "minimal", "oversized"))
                    .active(true)
                    .build());
            styleRuleRepository.save(StyleRule.builder()
                    .name("Streetwear")
                    .description("Đường phố năng động, sneaker và hoodie")
                    .keywords(List.of("street", "oversize", "bold", "chunky"))
                    .active(true)
                    .build());
            styleRuleRepository.save(StyleRule.builder()
                    .name("Minimal")
                    .description("Tối giản, neutral tone và chất liệu tự nhiên")
                    .keywords(List.of("minimal", "linen", "neutral", "quiet"))
                    .active(true)
                    .build());
        }

        if (occasionRuleRepository.count() == 0) {
            occasionRuleRepository.save(OccasionRule.builder()
                    .name("Đi cafe")
                    .description("Outfit thoải mái cho cafe và brunch")
                    .keywords(List.of("cafe", "casual", "nhẹ", "brunch"))
                    .active(true)
                    .build());
            occasionRuleRepository.save(OccasionRule.builder()
                    .name("Đi làm")
                    .description("Smart casual và công sở thanh lịch")
                    .keywords(List.of("office", "formal", "gọn", "blazer"))
                    .active(true)
                    .build());
            occasionRuleRepository.save(OccasionRule.builder()
                    .name("Dự tiệc")
                    .description("Tối sang trọng, satin và phụ kiện tinh tế")
                    .keywords(List.of("party", "evening", "dress", "satin"))
                    .active(true)
                    .build());
        }
    }

    private void seedFlaggedLinksIfEmpty() {
        if (flaggedLinkRepository.count() > 0) {
            return;
        }
        List<Product> activeProducts = productRepository.findByStatus(ProductStatus.ACTIVE);
        if (activeProducts.isEmpty()) {
            return;
        }

        Product brokenUrlProduct = activeProducts.get(0);
        flaggedLinkRepository.save(FlaggedLink.builder()
                .productId(brokenUrlProduct.getId())
                .purchaseUrl("not-a-valid-url")
                .reason(FlaggedLinkReason.BROKEN_URL)
                .status(FlaggedLinkStatus.OPEN)
                .build());

        if (activeProducts.size() > 1) {
            Product missingUrlProduct = activeProducts.get(1);
            flaggedLinkRepository.save(FlaggedLink.builder()
                    .productId(missingUrlProduct.getId())
                    .purchaseUrl("")
                    .reason(FlaggedLinkReason.MISSING_URL)
                    .status(FlaggedLinkStatus.OPEN)
                    .build());
        }

        log.info("Seeded sample flagged purchase links for admin review");
    }
}
