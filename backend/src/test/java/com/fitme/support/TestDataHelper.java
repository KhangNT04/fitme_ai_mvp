package com.fitme.support;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.billing.entity.BrandQuotaBalance;
import com.fitme.billing.repository.BrandQuotaBalanceRepository;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.*;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TestDataHelper {

    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final ProductVariantRepository variantRepository;
    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final BrandQuotaBalanceRepository brandQuotaBalanceRepository;

    public record BrandOwnerContext(UserAccount user, Brand brand) {}

    public record UserContext(UserAccount user) {}

    public record AdminContext(UserAccount user) {}

    @Transactional
    public UserContext createUser() {
        UserAccount user = userAccountRepository.save(UserAccount.builder()
                .email("user-" + UUID.randomUUID() + "@test.fitme.ai")
                .passwordHash(passwordEncoder.encode("test123"))
                .displayName("Test User")
                .role(UserRole.USER)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());
        return new UserContext(user);
    }

    @Transactional
    public BrandOwnerContext createBrandOwner() {
        UserAccount user = userAccountRepository.save(UserAccount.builder()
                .email("brand-owner-" + UUID.randomUUID() + "@test.fitme.ai")
                .passwordHash(passwordEncoder.encode("test123"))
                .displayName("Test Brand Owner")
                .role(UserRole.BRAND_OWNER)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());
        Brand brand = brandRepository.save(Brand.builder()
                .ownerUserId(user.getId())
                .name("Test Brand " + UUID.randomUUID())
                .status(BrandStatus.APPROVED)
                .contactEmail(user.getEmail())
                .build());
        return new BrandOwnerContext(user, brand);
    }

    @Transactional
    public AdminContext createAdmin() {
        UserAccount user = userAccountRepository.save(UserAccount.builder()
                .email("admin-" + UUID.randomUUID() + "@test.fitme.ai")
                .passwordHash(passwordEncoder.encode("test123"))
                .displayName("Test Admin")
                .role(UserRole.ADMIN)
                .emailVerified(true)
                .status(UserStatus.ACTIVE)
                .build());
        return new AdminContext(user);
    }

    @Transactional
    public Product createEligibleProduct(String name, String category) {
        Brand brand = brandRepository.save(Brand.builder()
                .name("Test Brand " + UUID.randomUUID())
                .status(BrandStatus.APPROVED)
                .contactEmail("test@fitme.ai")
                .build());

        Product product = productRepository.save(Product.builder()
                .brandId(brand.getId())
                .name(name)
                .description("Test product")
                .category(category)
                .price(BigDecimal.valueOf(299000))
                .fitType(FitPreference.REGULAR)
                .purchaseUrl("https://shopee.vn/test-product")
                .purchaseChannel(PurchaseChannel.SHOPEE)
                .stockStatus(StockStatus.IN_STOCK)
                .status(ProductStatus.ACTIVE)
                .aiTryOnEligible(true)
                .build());

        imageRepository.save(ProductImage.builder()
                .productId(product.getId())
                .imageUrl("https://picsum.photos/400/500")
                .imageType("MAIN")
                .sortOrder(0)
                .build());

        variantRepository.save(ProductVariant.builder()
                .productId(product.getId())
                .colorName("Navy")
                .colorHex("#000080")
                .sizeLabel("M")
                .sku("TEST-SKU")
                .stockStatus(StockStatus.IN_STOCK)
                .build());

        brandQuotaBalanceRepository.save(BrandQuotaBalance.builder()
                .brandId(brand.getId())
                .subscriptionRemaining(1000)
                .topupRemaining(0)
                .build());

        return product;
    }

    @Transactional
    public Product createDraftProductForBrand(Brand brand, String name) {
        Product product = productRepository.save(Product.builder()
                .brandId(brand.getId())
                .name(name)
                .category("Áo")
                .price(BigDecimal.valueOf(150000))
                .purchaseUrl("https://shopee.vn/draft")
                .purchaseChannel(PurchaseChannel.SHOPEE)
                .stockStatus(StockStatus.IN_STOCK)
                .status(ProductStatus.DRAFT)
                .build());

        imageRepository.save(ProductImage.builder()
                .productId(product.getId())
                .imageUrl("https://picsum.photos/400/500")
                .imageType("MAIN")
                .sortOrder(0)
                .build());

        variantRepository.save(ProductVariant.builder()
                .productId(product.getId())
                .colorName("Đen")
                .sizeLabel("M")
                .stockStatus(StockStatus.IN_STOCK)
                .build());

        return product;
    }

    @Transactional
    public Product createIneligibleProduct(String purchaseUrl) {
        Brand brand = brandRepository.save(Brand.builder()
                .name("Ineligible Brand " + UUID.randomUUID())
                .status(BrandStatus.APPROVED)
                .contactEmail("ineligible@fitme.ai")
                .build());

        return productRepository.save(Product.builder()
                .brandId(brand.getId())
                .name("Ineligible Product")
                .category("Áo thun")
                .price(BigDecimal.valueOf(100000))
                .purchaseUrl(purchaseUrl)
                .stockStatus(StockStatus.IN_STOCK)
                .status(ProductStatus.ACTIVE)
                .build());
    }
}
