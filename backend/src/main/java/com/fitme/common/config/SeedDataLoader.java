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
import com.fitme.product.entity.*;
import com.fitme.product.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class SeedDataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);
    private static final String DEMO_PRODUCT_PREFIX = "Sản phẩm demo ";

    private static final String[] CATEGORIES = {
            "Áo", "Áo", "Quần", "Quần", "Váy", "Áo khoác", "Giày", "Phụ kiện"
    };
    private static final String[] STYLES = {"Korean Casual", "Minimal", "Streetwear", "Office", "Vintage"};
    private static final String[] OCCASIONS = {"Đi cafe", "Đi làm", "Dạo phố", "Hẹn hò", "Dự tiệc"};
    private static final String[] COLORS = {"Đen", "Trắng", "Navy", "Beige", "Olive"};
    private static final String[] SIZES = {"S", "M", "L", "XL"};

    private final UserAccountRepository userRepository;
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductTagRepository tagRepository;
    private final SizeChartRepository sizeChartRepository;
    private final StyleRuleRepository styleRuleRepository;
    private final OccasionRuleRepository occasionRuleRepository;
    private final PasswordEncoder passwordEncoder;

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

    @Value("${fitme.seed.products-per-brand:18}")
    private int productsPerBrand;

    @Value("${fitme.seed.min-active-products:36}")
    private int minActiveProducts;

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            log.info("FitMe seed disabled (fitme.seed.enabled=false)");
            return;
        }

        if (userRepository.count() == 0) {
            seedFreshDatabase();
            return;
        }

        if (topUpEnabled) {
            repairAndTopUpCatalog();
        }
    }

    private void seedFreshDatabase() {
        log.info("Seeding FitMe AI demo data (fresh database)...");

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
                .displayName("Brand Owner")
                .role(UserRole.BRAND_OWNER)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());

        userRepository.save(UserAccount.builder()
                .email(userEmail)
                .passwordHash(passwordEncoder.encode(seedPassword))
                .displayName("Demo User")
                .role(UserRole.USER)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());

        Brand kStyle = ensureApprovedBrand(
                brandOwner.getId(),
                "K-Style House",
                "Thương hiệu thời trang Korean casual",
                "brand-kstyle",
                "hello@kstyle.vn");
        Brand linenMuse = ensureApprovedBrand(
                brandOwner.getId(),
                "Linen Muse",
                "Minimal linen & neutral tones",
                "brand-linen",
                "hello@linenmuse.vn");
        Brand seoulBasic = ensureApprovedBrand(
                brandOwner.getId(),
                "Seoul Basic",
                "Basics Hàn Quốc giá tốt",
                "brand-seoul",
                "hello@seoulbasic.vn");

        brandRepository.save(Brand.builder()
                .name("Urban Threads")
                .description("Streetwear đang chờ duyệt")
                .status(BrandStatus.PENDING)
                .contactEmail("pending@urban.vn")
                .build());

        int seq = 1;
        seq = seedProductsForBrand(kStyle, seq, 0);
        seq = seedProductsForBrand(linenMuse, seq, 5);
        seq = seedProductsForBrand(seoulBasic, seq, 11);

        seedRulesIfEmpty();

        log.info(
                "Seed complete: {} demo products across 3 brands. Admin: {} / {}",
                seq - 1,
                adminEmail,
                seedPassword);
    }

    private void repairAndTopUpCatalog() {
        reactivateDemoProducts();
        ensureDemoBrandsExist();

        List<Brand> approvedBrands = brandRepository.findByStatus(BrandStatus.APPROVED);
        if (approvedBrands.isEmpty()) {
            log.warn("No approved brands — skip catalog top-up");
            return;
        }

        int activeCount = productRepository.findByStatus(ProductStatus.ACTIVE).size();
        if (activeCount >= minActiveProducts) {
            log.debug("Catalog OK: {} active products (min {})", activeCount, minActiveProducts);
            return;
        }

        log.info("Top-up demo catalog: {} active products, target at least {}", activeCount, minActiveProducts);

        int seq = (int) productRepository.count() + 1;
        int brandIndex = 0;
        for (Brand brand : approvedBrands) {
            long activeForBrand = productRepository.findByBrandIdAndStatus(brand.getId(), ProductStatus.ACTIVE).size();
            int need = Math.max(0, productsPerBrand - (int) activeForBrand);
            if (need > 0) {
                log.info("Adding {} products for brand {}", need, brand.getName());
                seq = seedProductsForBrand(brand, seq, brandIndex * 3, need);
            }
            brandIndex++;
        }

        int after = productRepository.findByStatus(ProductStatus.ACTIVE).size();
        log.info("Catalog top-up done: {} active products", after);
    }

    private void reactivateDemoProducts() {
        int reactivated = 0;
        for (ProductStatus status : List.of(ProductStatus.PENDING_REVIEW, ProductStatus.DRAFT, ProductStatus.INACTIVE)) {
            for (Product product : productRepository.findByStatus(status)) {
                if (!product.getName().startsWith(DEMO_PRODUCT_PREFIX)) {
                    continue;
                }
                if (!isApprovedBrand(product.getBrandId())) {
                    continue;
                }
                product.setStatus(ProductStatus.ACTIVE);
                product.setAiTryOnEligible(true);
                productRepository.save(product);
                reactivated++;
            }
        }
        if (reactivated > 0) {
            log.info("Reactivated {} demo products", reactivated);
        }
    }

    private void ensureDemoBrandsExist() {
        userRepository.findByEmail(brandEmail).ifPresent(owner -> {
            ensureApprovedBrand(
                    owner.getId(),
                    "K-Style House",
                    "Thương hiệu thời trang Korean casual",
                    "brand-kstyle",
                    "hello@kstyle.vn");
            ensureApprovedBrand(
                    owner.getId(),
                    "Linen Muse",
                    "Minimal linen & neutral tones",
                    "brand-linen",
                    "hello@linenmuse.vn");
            ensureApprovedBrand(
                    owner.getId(),
                    "Seoul Basic",
                    "Basics Hàn Quốc giá tốt",
                    "brand-seoul",
                    "hello@seoulbasic.vn");
        });
    }

    private boolean isApprovedBrand(UUID brandId) {
        return brandRepository.findById(brandId)
                .map(b -> b.getStatus() == BrandStatus.APPROVED)
                .orElse(false);
    }

    private Brand ensureApprovedBrand(
            UUID ownerUserId, String name, String description, String logoSeed, String contactEmail) {
        Optional<Brand> existing = brandRepository.findByName(name);
        if (existing.isPresent()) {
            Brand brand = existing.get();
            if (brand.getStatus() != BrandStatus.APPROVED) {
                brand.setStatus(BrandStatus.APPROVED);
                brand.setOwnerUserId(ownerUserId);
                return brandRepository.save(brand);
            }
            return brand;
        }
        return brandRepository.save(Brand.builder()
                .ownerUserId(ownerUserId)
                .name(name)
                .description(description)
                .logoUrl("https://picsum.photos/seed/" + logoSeed + "/200/200")
                .websiteUrl("https://example.com/" + logoSeed)
                .shopeeUrl("https://shopee.vn/" + logoSeed)
                .status(BrandStatus.APPROVED)
                .contactEmail(contactEmail)
                .build());
    }

    private int seedProductsForBrand(Brand brand, int startSeq, int categoryOffset) {
        return seedProductsForBrand(brand, startSeq, categoryOffset, productsPerBrand);
    }

    private int seedProductsForBrand(Brand brand, int startSeq, int categoryOffset, int count) {
        int seq = startSeq;
        for (int i = 0; i < count; i++) {
            createDemoProduct(brand, seq, categoryOffset + i);
            seq++;
        }
        return seq;
    }

    private void createDemoProduct(Brand brand, int seq, int categoryIndex) {
        String category = CATEGORIES[categoryIndex % CATEGORIES.length];
        Product product = productRepository.save(Product.builder()
                .brandId(brand.getId())
                .name(DEMO_PRODUCT_PREFIX + seq + " - " + category)
                .description("Mô tả sản phẩm demo số " + seq + " — " + brand.getName())
                .category(category)
                .price(BigDecimal.valueOf(150000 + (long) seq * 25000L))
                .material("Cotton")
                .fitType(FitPreference.REGULAR)
                .purchaseUrl("https://shopee.vn/demo-product-" + seq)
                .purchaseChannel(PurchaseChannel.SHOPEE)
                .stockStatus(StockStatus.IN_STOCK)
                .status(ProductStatus.ACTIVE)
                .isSponsored(seq % 5 == 0)
                .aiTryOnEligible(true)
                .build());

        String imageSeed = product.getId().toString();
        imageRepository.save(ProductImage.builder()
                .productId(product.getId())
                .imageUrl("https://picsum.photos/seed/" + imageSeed + "-main/400/500")
                .imageType("MAIN")
                .sortOrder(0)
                .build());
        imageRepository.save(ProductImage.builder()
                .productId(product.getId())
                .imageUrl("https://picsum.photos/seed/" + imageSeed + "-detail1/400/500")
                .imageType("DETAIL")
                .sortOrder(1)
                .build());
        imageRepository.save(ProductImage.builder()
                .productId(product.getId())
                .imageUrl("https://picsum.photos/seed/" + imageSeed + "-detail2/400/500")
                .imageType("DETAIL")
                .sortOrder(2)
                .build());

        for (String size : SIZES) {
            for (String color : new String[]{COLORS[seq % COLORS.length], COLORS[(seq + 1) % COLORS.length]}) {
                variantRepository.save(ProductVariant.builder()
                        .productId(product.getId())
                        .colorName(color)
                        .colorHex("#333333")
                        .sizeLabel(size)
                        .sku("SKU-" + seq + "-" + size + "-" + color.charAt(0))
                        .stockStatus(StockStatus.IN_STOCK)
                        .build());
            }
        }

        tagRepository.save(ProductTag.builder()
                .productId(product.getId())
                .tagType("STYLE")
                .tagValue(STYLES[seq % STYLES.length])
                .build());
        tagRepository.save(ProductTag.builder()
                .productId(product.getId())
                .tagType("OCCASION")
                .tagValue(OCCASIONS[seq % OCCASIONS.length])
                .build());
        tagRepository.save(ProductTag.builder()
                .productId(product.getId())
                .tagType("COLOR")
                .tagValue(COLORS[seq % COLORS.length])
                .build());

        for (String size : SIZES) {
            sizeChartRepository.save(SizeChart.builder()
                    .productId(product.getId())
                    .sizeLabel(size)
                    .chestCm(BigDecimal.valueOf(90 + SIZES.length))
                    .waistCm(BigDecimal.valueOf(70 + SIZES.length))
                    .hipCm(BigDecimal.valueOf(92 + SIZES.length))
                    .heightMinCm(155)
                    .heightMaxCm(185)
                    .weightMinKg(BigDecimal.valueOf(45))
                    .weightMaxKg(BigDecimal.valueOf(85))
                    .build());
        }
    }

    private void seedRulesIfEmpty() {
        if (styleRuleRepository.count() == 0) {
            styleRuleRepository.save(StyleRule.builder()
                    .name("Korean Casual")
                    .description("Phong cách Hàn Quốc nhẹ nhàng")
                    .keywords(List.of("korean", "casual", "minimal"))
                    .active(true)
                    .build());
            styleRuleRepository.save(StyleRule.builder()
                    .name("Streetwear")
                    .description("Đường phố năng động")
                    .keywords(List.of("street", "oversize", "bold"))
                    .active(true)
                    .build());
        }

        if (occasionRuleRepository.count() == 0) {
            occasionRuleRepository.save(OccasionRule.builder()
                    .name("Đi cafe")
                    .description("Outfit thoải mái cho cafe")
                    .keywords(List.of("cafe", "casual", "nhẹ"))
                    .active(true)
                    .build());
            occasionRuleRepository.save(OccasionRule.builder()
                    .name("Đi làm")
                    .description("Trang phục công sở")
                    .keywords(List.of("office", "formal", "gọn"))
                    .active(true)
                    .build());
        }
    }
}
