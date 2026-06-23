package com.fitme.config;

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
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class SeedDataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);

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

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }
        log.info("Seeding FitMe AI demo data...");

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

        Brand approvedBrand = brandRepository.save(Brand.builder()
                .ownerUserId(brandOwner.getId())
                .name("K-Style House")
                .description("Thương hiệu thời trang Korean casual")
                .logoUrl("https://picsum.photos/seed/brand1/200/200")
                .websiteUrl("https://example.com/kstyle")
                .shopeeUrl("https://shopee.vn/kstyle")
                .status(BrandStatus.APPROVED)
                .contactEmail("hello@kstyle.vn")
                .build());

        brandRepository.save(Brand.builder()
                .name("Urban Threads")
                .description("Streetwear đang chờ duyệt")
                .status(BrandStatus.PENDING)
                .contactEmail("pending@urban.vn")
                .build());

        String[] categories = {"Áo thun", "Áo sơ mi", "Quần jean", "Quần tây", "Váy", "Áo khoác", "Giày sneaker"};
        String[] styles = {"Korean Casual", "Minimal", "Streetwear", "Office", "Vintage"};
        String[] occasions = {"Đi cafe", "Đi làm", "Dạo phố", "Hẹn hò", "Dự tiệc"};
        String[] colors = {"Đen", "Trắng", "Navy", "Beige", "Olive"};
        String[] sizes = {"S", "M", "L", "XL"};

        for (int i = 1; i <= 20; i++) {
            String category = categories[i % categories.length];
            Product product = productRepository.save(Product.builder()
                    .brandId(approvedBrand.getId())
                    .name("Sản phẩm demo " + i + " - " + category)
                    .description("Mô tả sản phẩm demo số " + i)
                    .category(category)
                    .price(BigDecimal.valueOf(150000 + i * 25000L))
                    .material("Cotton")
                    .fitType(FitPreference.REGULAR)
                    .purchaseUrl("https://shopee.vn/product-" + i)
                    .purchaseChannel(PurchaseChannel.SHOPEE)
                    .stockStatus(StockStatus.IN_STOCK)
                    .status(ProductStatus.ACTIVE)
                    .isSponsored(i % 5 == 0)
                    .aiTryOnEligible(true)
                    .build());

            imageRepository.save(ProductImage.builder()
                    .productId(product.getId())
                    .imageUrl("https://picsum.photos/seed/" + product.getId() + "/400/500")
                    .imageType("MAIN")
                    .sortOrder(0)
                    .build());

            for (String size : sizes) {
                for (String color : new String[]{colors[i % colors.length], colors[(i + 1) % colors.length]}) {
                    variantRepository.save(ProductVariant.builder()
                            .productId(product.getId())
                            .colorName(color)
                            .colorHex("#333333")
                            .sizeLabel(size)
                            .sku("SKU-" + i + "-" + size)
                            .stockStatus(StockStatus.IN_STOCK)
                            .build());
                }
            }

            tagRepository.save(ProductTag.builder().productId(product.getId()).tagType("STYLE").tagValue(styles[i % styles.length]).build());
            tagRepository.save(ProductTag.builder().productId(product.getId()).tagType("OCCASION").tagValue(occasions[i % occasions.length]).build());
            tagRepository.save(ProductTag.builder().productId(product.getId()).tagType("COLOR").tagValue(colors[i % colors.length]).build());

            for (String size : sizes) {
                sizeChartRepository.save(SizeChart.builder()
                        .productId(product.getId())
                        .sizeLabel(size)
                        .chestCm(BigDecimal.valueOf(90 + sizes.length))
                        .waistCm(BigDecimal.valueOf(70 + sizes.length))
                        .hipCm(BigDecimal.valueOf(92 + sizes.length))
                        .heightMinCm(155)
                        .heightMaxCm(185)
                        .weightMinKg(BigDecimal.valueOf(45))
                        .weightMaxKg(BigDecimal.valueOf(85))
                        .build());
            }
        }

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

        log.info("Seed complete. Admin: {} / {}", adminEmail, seedPassword);
    }
}
