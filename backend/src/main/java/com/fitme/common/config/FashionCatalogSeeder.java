package com.fitme.common.config;

import com.fitme.brand.entity.Brand;
import com.fitme.common.enums.*;
import com.fitme.product.entity.*;
import com.fitme.product.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FashionCatalogSeeder {

    private static final Logger log = LoggerFactory.getLogger(FashionCatalogSeeder.class);
    private static final String LEGACY_DEMO_PREFIX = "Sản phẩm demo ";
    private static final String CATALOG_META_TAG = "catalog-v6";
    private static final String[] SIZES = {"S", "M", "L", "XL"};

    private final FashionCatalogLoader catalogLoader;
    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductTagRepository tagRepository;
    private final SizeChartRepository sizeChartRepository;

    public int seedBrandCatalog(Brand brand, FashionCatalogLoader.BrandEntry entry) {
        int created = 0;
        int seq = 1;
        for (FashionCatalogLoader.ProductEntry productEntry : entry.products) {
            createCatalogProduct(brand, entry.key, productEntry, seq++);
            created++;
        }
        log.info("Seeded {} fashion products for {}", created, brand.getName());
        return created;
    }

    public boolean needsFashionRefresh(Brand brand, FashionCatalogLoader.BrandEntry entry) {
        List<Product> existing = productRepository.findByBrandId(brand.getId());
        if (existing.isEmpty()) {
            return true;
        }
        long activeCount = existing.stream().filter(p -> p.getStatus() == ProductStatus.ACTIVE).count();
        if (activeCount != entry.products.size()) {
            return true;
        }
        return existing.stream().anyMatch(p -> p.getName().startsWith(LEGACY_DEMO_PREFIX))
                || existing.stream().anyMatch(p -> !hasCurrentCatalogMeta(p))
                || existing.stream().anyMatch(this::missingTargetGenderTag)
                || usesRemoteCatalogImages(existing);
    }

    private boolean missingTargetGenderTag(Product product) {
        return tagRepository.findByProductId(product.getId()).stream()
                .noneMatch(t -> "TARGET_GENDER".equals(t.getTagType()));
    }

    private boolean hasCurrentCatalogMeta(Product product) {
        return tagRepository.findByProductId(product.getId()).stream()
                .anyMatch(t -> "META".equals(t.getTagType()) && CATALOG_META_TAG.equals(t.getTagValue()));
    }

    private boolean usesRemoteCatalogImages(List<Product> products) {
        for (Product product : products) {
            for (ProductImage image : imageRepository.findByProductIdOrderBySortOrderAsc(product.getId())) {
                String url = image.getImageUrl();
                if (url != null && url.startsWith("https://images.unsplash.com")) {
                    return true;
                }
            }
        }
        return false;
    }

    /** Updates products in place so FK references (recommendations, try-on, …) stay valid. */
    public void syncBrandCatalog(Brand brand, FashionCatalogLoader.BrandEntry entry) {
        List<Product> existing = productRepository.findByBrandId(brand.getId()).stream()
                .sorted(Comparator.comparing(Product::getCreatedAt))
                .toList();

        int seq = 1;
        for (int i = 0; i < entry.products.size(); i++) {
            FashionCatalogLoader.ProductEntry productEntry = entry.products.get(i);
            if (i < existing.size()) {
                updateCatalogProduct(existing.get(i), brand, entry.key, productEntry, seq++);
            } else {
                createCatalogProduct(brand, entry.key, productEntry, seq++);
            }
        }

        for (int i = entry.products.size(); i < existing.size(); i++) {
            Product extra = existing.get(i);
            extra.setStatus(ProductStatus.INACTIVE);
            productRepository.save(extra);
        }

        log.info("Synced {} fashion products for {}", entry.products.size(), brand.getName());
    }

    private void updateCatalogProduct(
            Product product,
            Brand brand,
            String brandKey,
            FashionCatalogLoader.ProductEntry entry,
            int seq) {
        FitPreference fitType = parseFitType(entry.fitType);

        product.setName(entry.name);
        product.setDescription(entry.description);
        product.setCategory(entry.category);
        product.setPrice(BigDecimal.valueOf(entry.price));
        product.setMaterial(entry.material);
        product.setFitType(fitType);
        product.setPurchaseUrl("https://shopee.vn/" + brandKey + "/" + slugify(entry.name));
        product.setPurchaseChannel(PurchaseChannel.SHOPEE);
        product.setStockStatus(StockStatus.IN_STOCK);
        product.setStatus(ProductStatus.ACTIVE);
        product.setSponsored(entry.sponsored);
        product.setAiTryOnEligible(isTryOnCategory(entry.category));
        productRepository.save(product);

        clearRelatedData(product.getId());
        saveRelatedData(product.getId(), brandKey, entry, seq);
    }

    private void createCatalogProduct(
            Brand brand,
            String brandKey,
            FashionCatalogLoader.ProductEntry entry,
            int seq) {
        FitPreference fitType = parseFitType(entry.fitType);

        Product product = productRepository.save(Product.builder()
                .brandId(brand.getId())
                .name(entry.name)
                .description(entry.description)
                .category(entry.category)
                .price(BigDecimal.valueOf(entry.price))
                .material(entry.material)
                .fitType(fitType)
                .purchaseUrl("https://shopee.vn/" + brandKey + "/" + slugify(entry.name))
                .purchaseChannel(PurchaseChannel.SHOPEE)
                .stockStatus(StockStatus.IN_STOCK)
                .status(ProductStatus.ACTIVE)
                .isSponsored(entry.sponsored)
                .aiTryOnEligible(isTryOnCategory(entry.category))
                .build());

        saveRelatedData(product.getId(), brandKey, entry, seq);
    }

    private void clearRelatedData(UUID productId) {
        imageRepository.findByProductIdOrderBySortOrderAsc(productId).forEach(imageRepository::delete);
        variantRepository.findByProductId(productId).forEach(variantRepository::delete);
        tagRepository.findByProductId(productId).forEach(tagRepository::delete);
        sizeChartRepository.findByProductId(productId).forEach(sizeChartRepository::delete);
    }

    private void saveRelatedData(UUID productId, String brandKey, FashionCatalogLoader.ProductEntry entry, int seq) {
        FashionCatalogLoader.FashionCatalog catalog = catalogLoader.load();
        List<String> imageUrls = catalog.images.get(entry.imageKey);
        if (imageUrls == null || imageUrls.isEmpty()) {
            throw new IllegalStateException("Missing image key: " + entry.imageKey);
        }

        for (int i = 0; i < imageUrls.size(); i++) {
            imageRepository.save(ProductImage.builder()
                    .productId(productId)
                    .imageUrl(imageUrls.get(i))
                    .imageType(i == 0 ? "MAIN" : "DETAIL")
                    .sortOrder(i)
                    .build());
        }

        List<String> colors = entry.colors != null && !entry.colors.isEmpty()
                ? entry.colors
                : List.of("Đen", "Trắng");

        for (String size : SIZES) {
            for (String color : colors) {
                variantRepository.save(ProductVariant.builder()
                        .productId(productId)
                        .colorName(color)
                        .colorHex("#333333")
                        .sizeLabel(size)
                        .sku("FITME-" + brandKey + "-" + seq + "-" + size + "-" + color.charAt(0))
                        .stockStatus(StockStatus.IN_STOCK)
                        .build());
            }
        }

        if (entry.styleTag != null) {
            tagRepository.save(ProductTag.builder()
                    .productId(productId)
                    .tagType("STYLE")
                    .tagValue(entry.styleTag)
                    .build());
        }
        if (entry.occasionTag != null) {
            tagRepository.save(ProductTag.builder()
                    .productId(productId)
                    .tagType("OCCASION")
                    .tagValue(entry.occasionTag)
                    .build());
        }
        tagRepository.save(ProductTag.builder()
                .productId(productId)
                .tagType("TARGET_GENDER")
                .tagValue(inferTargetGender(entry).name())
                .build());
        tagRepository.save(ProductTag.builder()
                .productId(productId)
                .tagType("COLOR")
                .tagValue(colors.get(0))
                .build());
        tagRepository.save(ProductTag.builder()
                .productId(productId)
                .tagType("META")
                .tagValue(CATALOG_META_TAG)
                .build());

        for (String size : SIZES) {
            sizeChartRepository.save(SizeChart.builder()
                    .productId(productId)
                    .sizeLabel(size)
                    .chestCm(BigDecimal.valueOf(88 + SIZES.length))
                    .waistCm(BigDecimal.valueOf(68 + SIZES.length))
                    .hipCm(BigDecimal.valueOf(90 + SIZES.length))
                    .heightMinCm(155)
                    .heightMaxCm(185)
                    .weightMinKg(BigDecimal.valueOf(45))
                    .weightMaxKg(BigDecimal.valueOf(85))
                    .build());
        }
    }

    private static ProductTargetGender inferTargetGender(FashionCatalogLoader.ProductEntry entry) {
        String category = entry.category != null ? entry.category.toLowerCase() : "";
        String name = entry.name != null ? entry.name.toLowerCase() : "";
        if (category.contains("váy") || name.contains("váy") || name.contains("dress")) {
            return ProductTargetGender.FEMALE;
        }
        return ProductTargetGender.UNISEX;
    }

    private static FitPreference parseFitType(String fitType) {
        if (fitType == null) {
            return FitPreference.REGULAR;
        }
        try {
            return FitPreference.valueOf(fitType);
        } catch (IllegalArgumentException ignored) {
            return FitPreference.REGULAR;
        }
    }

    private static boolean isTryOnCategory(String category) {
        return !"Phụ kiện".equals(category);
    }

    private static String slugify(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-");
    }
}
