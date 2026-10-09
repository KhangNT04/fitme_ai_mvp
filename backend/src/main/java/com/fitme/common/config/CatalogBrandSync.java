package com.fitme.common.config;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.brand.service.BrandPartnershipService;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.UserRole;
import com.fitme.common.enums.UserStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Keeps the seed catalog's brands in step with the database: brands are matched by their catalog key,
 * each one is owned by its own BRAND_OWNER account, and retired demo brands are soft-retired.
 */
@Component
public class CatalogBrandSync {

    private static final Logger log = LoggerFactory.getLogger(CatalogBrandSync.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserAccountRepository userRepository;
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final BrandPartnershipService brandPartnershipService;
    private final CatalogMediaService catalogMediaService;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;
    private final String brandEmail;
    private final String seedPassword;
    private final boolean catalogOwnerLogin;

    public CatalogBrandSync(
            UserAccountRepository userRepository,
            BrandRepository brandRepository,
            ProductRepository productRepository,
            BrandPartnershipService brandPartnershipService,
            CatalogMediaService catalogMediaService,
            PasswordEncoder passwordEncoder,
            Environment environment,
            @Value("${fitme.seed.brand-email:brand@fitme.ai}") String brandEmail,
            @Value("${fitme.seed.password:}") String seedPassword,
            // Dev/CI only: catalog brand-owner accounts also get the seed password so E2E can sign in as a brand.
            @Value("${fitme.seed.catalog-owner-login:false}") boolean catalogOwnerLogin) {
        this.userRepository = userRepository;
        this.brandRepository = brandRepository;
        this.productRepository = productRepository;
        this.brandPartnershipService = brandPartnershipService;
        this.catalogMediaService = catalogMediaService;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
        this.brandEmail = brandEmail;
        this.seedPassword = seedPassword;
        this.catalogOwnerLogin = catalogOwnerLogin;
    }

    /** BCrypt of a random secret that is never stored or logged: nobody can sign in until it is reset. */
    public static String unusablePasswordHash(PasswordEncoder passwordEncoder) {
        byte[] secret = new byte[32];
        SECURE_RANDOM.nextBytes(secret);
        return passwordEncoder.encode(Base64.getUrlEncoder().withoutPadding().encodeToString(secret));
    }

    /**
     * Finds the catalog brand by its catalog key (adopting a legacy unkeyed row with the same name once),
     * or creates it APPROVED. Status is only set on creation so an admin suspension sticks, and profile
     * fields are only re-applied while the owner has not edited the brand and the catalog entry changed.
     */
    @Transactional
    public Brand ensureBrand(FashionCatalogLoader.BrandEntry entry) {
        UUID ownerUserId = ensureOwnerAccount(entry).getId();
        String catalogHash = catalogHash(entry);
        Optional<Brand> existing = brandRepository.findByCatalogKey(entry.key).or(() -> adoptLegacyBrand(entry));
        if (existing.isPresent()) {
            Brand brand = existing.get();
            if (brand.isCatalogManaged() && !catalogHash.equals(brand.getCatalogHash())) {
                applyCatalogProfile(brand, entry);
                brand.setCatalogHash(catalogHash);
            }
            if (shouldReassignOwner(brand, ownerUserId)) {
                log.info("Brand {} is now managed by its own account", brand.getName());
                brand.setOwnerUserId(ownerUserId);
            }
            return brandRepository.save(brand);
        }
        Brand brand = Brand.builder()
                .ownerUserId(ownerUserId)
                .name(entry.name)
                .status(BrandStatus.APPROVED)
                .catalogKey(entry.key)
                .catalogManaged(true)
                .catalogHash(catalogHash)
                .build();
        applyCatalogProfile(brand, entry);
        return brandRepository.save(brand);
    }

    /**
     * Soft-retires demo brands dropped from the catalog: suspended, unowned, products hidden and
     * partnerships ended. Rows are kept so users' try-on, wardrobe and click history stay intact.
     */
    @Transactional
    public void retireBrands(List<String> catalogKeys) {
        if (catalogKeys == null) {
            return;
        }
        for (String catalogKey : catalogKeys) {
            brandRepository.findByCatalogKey(catalogKey).ifPresent(this::retire);
        }
    }

    private void retire(Brand brand) {
        int hiddenProducts = 0;
        for (Product product : productRepository.findByBrandId(brand.getId())) {
            if (product.getStatus() != ProductStatus.INACTIVE) {
                product.setStatus(ProductStatus.INACTIVE);
                productRepository.save(product);
                hiddenProducts++;
            }
        }
        int endedPartnerships = brandPartnershipService.deactivateAllForBrand(brand.getId());
        boolean changed = brand.getStatus() != BrandStatus.SUSPENDED || brand.getOwnerUserId() != null;
        if (changed) {
            brand.setStatus(BrandStatus.SUSPENDED);
            brand.setOwnerUserId(null);
            brandRepository.save(brand);
        }
        if (changed || hiddenProducts > 0 || endedPartnerships > 0) {
            log.info("Retired demo brand {}: {} products hidden, {} partnerships ended",
                    brand.getName(), hiddenProducts, endedPartnerships);
        }
    }

    /**
     * Each catalog brand is managed by its own BRAND_OWNER account. Existing accounts are never touched; new
     * ones start with a random, unusable password until an admin hands the account over to the real brand.
     * Falls back to the shared seed brand account for entries without an owner email.
     */
    private UserAccount ensureOwnerAccount(FashionCatalogLoader.BrandEntry entry) {
        String email = entry.ownerEmail != null && !entry.ownerEmail.isBlank()
                ? entry.ownerEmail.trim().toLowerCase()
                : brandEmail;
        return userRepository.findByEmail(email).orElseGet(() -> {
            log.info("Creating brand owner account {} for {}", email, entry.name);
            return userRepository.save(UserAccount.builder()
                    .email(email)
                    .passwordHash(ownerPasswordHash())
                    .displayName(entry.name)
                    .role(UserRole.BRAND_OWNER)
                    .emailVerified(true)
                    .status(UserStatus.ACTIVE)
                    .build());
        });
    }

    private String ownerPasswordHash() {
        if (catalogOwnerLogin && seedPassword != null && !seedPassword.isBlank()) {
            if (!environment.acceptsProfiles(Profiles.of("prod"))) {
                return passwordEncoder.encode(seedPassword);
            }
            log.warn("fitme.seed.catalog-owner-login is ignored under the prod profile");
        }
        return unusablePasswordHash(passwordEncoder);
    }

    /** Brands still unowned or on the shared seed account move to their catalog owner; other owners are kept. */
    private boolean shouldReassignOwner(Brand brand, UUID catalogOwnerId) {
        UUID current = brand.getOwnerUserId();
        if (current == null) {
            return true;
        }
        if (current.equals(catalogOwnerId)) {
            return false;
        }
        return userRepository.findById(current)
                .map(owner -> owner.getEmail().equalsIgnoreCase(brandEmail))
                .orElse(true);
    }

    private Optional<Brand> adoptLegacyBrand(FashionCatalogLoader.BrandEntry entry) {
        Optional<Brand> legacy = brandRepository.findByNameIgnoreCaseOrderByCreatedAtAsc(entry.name).stream()
                .filter(b -> b.getCatalogKey() == null)
                .min(Comparator.comparing((Brand b) -> b.getStatus() != BrandStatus.APPROVED));
        legacy.ifPresent(brand -> {
            log.info("Linking existing brand {} to catalog key {}", brand.getName(), entry.key);
            brand.setCatalogKey(entry.key);
            brand.setCatalogManaged(true);
        });
        return legacy;
    }

    private void applyCatalogProfile(Brand brand, FashionCatalogLoader.BrandEntry entry) {
        brand.setDescription(entry.description);
        brand.setLogoUrl(catalogMediaService.resolve(entry.logoUrl));
        brand.setWebsiteUrl(entry.websiteUrl);
        brand.setShopeeUrl(entry.shopeeUrl);
        brand.setContactEmail(entry.contactEmail);
    }

    private static String catalogHash(FashionCatalogLoader.BrandEntry entry) {
        return FashionCatalogSeeder.sha256(String.join("\u0000",
                String.valueOf(entry.description), String.valueOf(entry.logoUrl), String.valueOf(entry.websiteUrl),
                String.valueOf(entry.shopeeUrl), String.valueOf(entry.contactEmail)));
    }
}
