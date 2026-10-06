package com.fitme.common.config;

import com.fitme.brand.entity.Brand;
import com.fitme.common.enums.*;
import com.fitme.common.util.UrlValidator;
import com.fitme.product.entity.*;
import com.fitme.product.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FashionCatalogSeeder {

    private static final Logger log = LoggerFactory.getLogger(FashionCatalogSeeder.class);
    private static final String LEGACY_DEMO_PREFIX = "Sản phẩm demo ";
    /** Bump when seeded product fields change so existing databases re-sync on startup. */
    private static final String CATALOG_META_TAG = "catalog-v8";
    private static final String[] SIZES = {"S", "M", "L", "XL"};
    /** Per size (same order as SIZES): chest, waist, hip, heightMin, heightMax, weightMin, weightMax. */
    private static final int[][] SIZE_CHART = {
            {84, 66, 88, 145, 162, 38, 52},
            {90, 72, 94, 158, 170, 48, 62},
            {96, 78, 100, 166, 178, 58, 72},
            {102, 84, 106, 174, 190, 68, 90},
    };
    private static final Map<String, String> COLOR_HEX = Map.of(
            "Trắng", "#FFFFFF",
            "Đen", "#111111",
            "Navy", "#1F2A44",
            "Beige", "#D8C3A5",
            "Olive", "#6B7B3A",
            "Xanh nhạt", "#A7C7E7",
            "Nâu", "#7B4B2A",
            "Xám", "#8E8E8E",
            "Cream", "#F3E9D2",
            "Champagne", "#E8D4B0");
    private static final String DEFAULT_COLOR_HEX = "#333333";

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
        List<Product> active = catalogManagedProducts(brand).stream()
                .filter(p -> p.getStatus() == ProductStatus.ACTIVE)
                .toList();
        if (active.size() != entry.products.size()) {
            return true;
        }
        return active.stream().anyMatch(p -> p.getName().startsWith(LEGACY_DEMO_PREFIX))
                || active.stream().anyMatch(p -> !hasCurrentCatalogMeta(p))
                || active.stream().anyMatch(this::missingTargetGenderTag)
                || usesRemoteCatalogImages(active);
    }

    /** Products the brand created itself (no catalog META tag) are never touched by the seeder. */
    private List<Product> catalogManagedProducts(Brand brand) {
        return productRepository.findByBrandId(brand.getId()).stream()
                .filter(p -> p.getName().startsWith(LEGACY_DEMO_PREFIX) || hasAnyCatalogMeta(p))
                .toList();
    }

    private boolean hasAnyCatalogMeta(Product product) {
        return tagRepository.findByProductId(product.getId()).stream()
                .anyMatch(t -> "META".equals(t.getTagType())
                        && t.getTagValue() != null
                        && t.getTagValue().startsWith("catalog-"));
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
        List<Product> existing = catalogManagedProducts(brand).stream()
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
        product.setPurchaseUrl(purchaseUrl(brand, brandKey, entry));
        product.setPurchaseChannel(PurchaseChannel.BRAND_WEBSITE);
        product.setStockStatus(StockStatus.IN_STOCK);
        product.setStatus(ProductStatus.ACTIVE);
        product.setSponsored(entry.sponsored);
        product.setAiTryOnEligible(isTryOnCategory(entry.category));
        productRepository.save(product);

        clearRelatedData(product.getId());
        saveRelatedData(product.getId(), brandKey, entry, seq);
    }

    private static List<String> colorsOf(FashionCatalogLoader.ProductEntry entry) {
        return entry.colors != null && !entry.colors.isEmpty()
                ? entry.colors
                : List.of("Đen", "Trắng");
    }

    private static String variantKey(String size, String color) {
        return size + "|" + color;
    }

    /** Variants are matched by size + colour so they keep their id; variants dropped from the catalog are deleted. */
    private void syncVariants(UUID productId, String brandKey, FashionCatalogLoader.ProductEntry entry, int seq) {
        Map<String, ProductVariant> existing = new HashMap<>();
        for (ProductVariant variant : variantRepository.findByProductId(productId)) {
            existing.putIfAbsent(variantKey(variant.getSizeLabel(), variant.getColorName()), variant);
        }

        Set<String> wanted = new HashSet<>();
        for (String size : SIZES) {
            for (String color : colorsOf(entry)) {
                String key = variantKey(size, color);
                wanted.add(key);
                ProductVariant current = existing.get(key);
                if (current == null) {
                    variantRepository.save(newVariant(productId, brandKey, seq, size, color));
                } else if (!colorHex(color).equals(current.getColorHex())) {
                    current.setColorHex(colorHex(color));
                    variantRepository.save(current);
                }
            }
        }

        for (ProductVariant variant : variantRepository.findByProductId(productId)) {
            if (!wanted.contains(variantKey(variant.getSizeLabel(), variant.getColorName()))) {
                variantRepository.delete(variant);
            }
        }
    }

    private static ProductVariant newVariant(UUID productId, String brandKey, int seq, String size, String color) {
        return ProductVariant.builder()
                .productId(productId)
                .colorName(color)
                .colorHex(colorHex(color))
                .sizeLabel(size)
                .sku("FITME-" + brandKey + "-" + seq + "-" + size + "-" + color.charAt(0))
                .stockStatus(StockStatus.IN_STOCK)
                .build();
    }

    private static String colorHex(String color) {
        return COLOR_HEX.getOrDefault(color, DEFAULT_COLOR_HEX);
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
                .purchaseUrl(purchaseUrl(brand, brandKey, entry))
                .purchaseChannel(PurchaseChannel.BRAND_WEBSITE)
                .stockStatus(StockStatus.IN_STOCK)
                .status(ProductStatus.ACTIVE)
                .isSponsored(entry.sponsored)
                .aiTryOnEligible(isTryOnCategory(entry.category))
                .build());

        saveRelatedData(product.getId(), brandKey, entry, seq);
    }

    private void clearRelatedData(UUID productId) {
        imageRepository.findByProductIdOrderBySortOrderAsc(productId).forEach(imageRepository::delete);
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

        List<String> colors = colorsOf(entry);
        syncVariants(productId, brandKey, entry, seq);

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

        for (int i = 0; i < SIZES.length; i++) {
            int[] row = SIZE_CHART[i];
            sizeChartRepository.save(SizeChart.builder()
                    .productId(productId)
                    .sizeLabel(SIZES[i])
                    .chestCm(BigDecimal.valueOf(row[0]))
                    .waistCm(BigDecimal.valueOf(row[1]))
                    .hipCm(BigDecimal.valueOf(row[2]))
                    .heightMinCm(row[3])
                    .heightMaxCm(row[4])
                    .weightMinKg(BigDecimal.valueOf(row[5]))
                    .weightMaxKg(BigDecimal.valueOf(row[6]))
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

    /** Product page on the brand's own store: its website when configured, else https://{brandKey}.vn. */
    static String purchaseUrl(Brand brand, String brandKey, FashionCatalogLoader.ProductEntry entry) {
        String website = brand.getWebsiteUrl();
        String base = UrlValidator.isValidHttpUrl(website)
                ? website.trim().replaceAll("/+$", "")
                : "https://" + brandKey.replace("-", "") + ".vn";
        return base + "/products/" + slugify(entry.name);
    }

    private static String slugify(String name) {
        String ascii = Normalizer.normalize(name.toLowerCase().replace('đ', 'd'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return ascii.replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-");
    }
}
