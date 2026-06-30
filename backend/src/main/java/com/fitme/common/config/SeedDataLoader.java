package com.fitme.common.config;

import com.fitme.admin.entity.OccasionRule;
import com.fitme.admin.entity.StyleRule;
import com.fitme.admin.repository.OccasionRuleRepository;
import com.fitme.admin.repository.StyleRuleRepository;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.*;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
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
import java.util.UUID;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class SeedDataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);
    private static final String LEGACY_DEMO_PREFIX = "Sản phẩm demo ";

    private final UserAccountRepository userRepository;
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final StyleRuleRepository styleRuleRepository;
    private final OccasionRuleRepository occasionRuleRepository;
    private final PasswordEncoder passwordEncoder;
    private final FashionCatalogLoader fashionCatalogLoader;
    private final FashionCatalogSeeder fashionCatalogSeeder;

    @Value("${fitme.seed.admin-email:admin@fitme.ai}")
    private String adminEmail;

    @Value("${fitme.seed.brand-email:brand@fitme.ai}")
    private String brandEmail;

    @Value("${fitme.seed.user-email:user@fitme.ai}")
    private String userEmail;

    @Value("${fitme.seed.password:fitme123}")
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

        userRepository.save(UserAccount.builder()
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(seedPassword))
                .displayName("FitMe Admin")
                .role(UserRole.ADMIN)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());

        UserAccount brandOwner = userRepository.save(UserAccount.builder()
                .email(brandEmail)
                .passwordHash(passwordEncoder.encode(seedPassword))
                .displayName("FitMe Editorial")
                .role(UserRole.BRAND_OWNER)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());

        userRepository.save(UserAccount.builder()
                .email(userEmail)
                .passwordHash(passwordEncoder.encode(seedPassword))
                .displayName("Minh Anh")
                .role(UserRole.USER)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());

        int totalProducts = 0;
        for (FashionCatalogLoader.BrandEntry entry : fashionCatalogLoader.load().brands) {
            Brand brand = ensureApprovedBrand(brandOwner.getId(), entry);
            totalProducts += fashionCatalogSeeder.seedBrandCatalog(brand, entry);
        }

        brandRepository.save(Brand.builder()
                .name("Urban Threads")
                .description("Streetwear đường phố — đang chờ duyệt từ ban biên tập FitMe.")
                .logoUrl("https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=200&h=200&q=80")
                .status(BrandStatus.PENDING)
                .contactEmail("pending@urban.vn")
                .build());

        seedRulesIfEmpty();

        log.info(
                "Seed complete: {} fashion products across {} brands. Admin: {} / {}",
                totalProducts,
                fashionCatalogLoader.load().brands.size(),
                adminEmail,
                seedPassword);
    }

    /** Refresh fashion catalog on existing DB (local, staging, or prod with seed off). */
    private void refreshFashionCatalogData() {
        deactivateOrphanLegacyDemoProducts();
        ensureFashionBrandsExist();

        if (fashionCatalogRefresh) {
            refreshFashionCatalog();
        }

        seedRulesIfEmpty();

        int activeCount = productRepository.findByStatus(ProductStatus.ACTIVE).size();
        log.info("Catalog status: {} active products", activeCount);
    }

    private void deactivateOrphanLegacyDemoProducts() {
        List<Product> legacy = productRepository.findByNameStartingWith(LEGACY_DEMO_PREFIX);
        FashionCatalogLoader.FashionCatalog catalog = fashionCatalogLoader.load();
        var fashionBrandIds = catalog.brands.stream()
                .map(entry -> brandRepository.findByName(entry.name).map(Brand::getId))
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
        FashionCatalogLoader.FashionCatalog catalog = fashionCatalogLoader.load();
        Optional<UserAccount> brandOwner = userRepository.findByEmail(brandEmail);
        if (brandOwner.isEmpty()) {
            log.warn("Fashion catalog refresh skipped: brand owner {} not found", brandEmail);
            return;
        }
        UserAccount owner = brandOwner.get();
        for (FashionCatalogLoader.BrandEntry entry : catalog.brands) {
            Brand brand = ensureApprovedBrand(owner.getId(), entry);
            if (fashionCatalogSeeder.needsFashionRefresh(brand, entry)) {
                log.info("Refreshing fashion catalog for brand {}", brand.getName());
                fashionCatalogSeeder.syncBrandCatalog(brand, entry);
            }
        }
    }

    private void ensureFashionBrandsExist() {
        userRepository.findByEmail(brandEmail).ifPresent(owner -> {
            for (FashionCatalogLoader.BrandEntry entry : fashionCatalogLoader.load().brands) {
                ensureApprovedBrand(owner.getId(), entry);
            }
        });
    }

    private boolean isApprovedBrand(UUID brandId) {
        return brandRepository.findById(brandId)
                .map(b -> b.getStatus() == BrandStatus.APPROVED)
                .orElse(false);
    }

    private Brand ensureApprovedBrand(UUID ownerUserId, FashionCatalogLoader.BrandEntry entry) {
        Optional<Brand> existing = brandRepository.findByName(entry.name);
        if (existing.isPresent()) {
            Brand brand = existing.get();
            brand.setDescription(entry.description);
            brand.setLogoUrl(entry.logoUrl);
            brand.setWebsiteUrl(entry.websiteUrl);
            brand.setShopeeUrl(entry.shopeeUrl);
            brand.setContactEmail(entry.contactEmail);
            if (brand.getStatus() != BrandStatus.APPROVED) {
                brand.setStatus(BrandStatus.APPROVED);
            }
            if (brand.getOwnerUserId() == null) {
                brand.setOwnerUserId(ownerUserId);
            }
            return brandRepository.save(brand);
        }
        return brandRepository.save(Brand.builder()
                .ownerUserId(ownerUserId)
                .name(entry.name)
                .description(entry.description)
                .logoUrl(entry.logoUrl)
                .websiteUrl(entry.websiteUrl)
                .shopeeUrl(entry.shopeeUrl)
                .status(BrandStatus.APPROVED)
                .contactEmail(entry.contactEmail)
                .build());
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
}
