package com.fitme.common.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FashionCatalogSeeder {

    private static final Logger log = LoggerFactory.getLogger(FashionCatalogSeeder.class);
    /** Bump when seeded product fields change so existing databases re-sync on startup. */
    private static final String CATALOG_META_TAG = "catalog-v9";
    private static final List<String> DEFAULT_SIZES = List.of("S", "M", "L", "XL");
    private static final List<String> STANDARD_SIZES = List.of("XS", "S", "M", "L", "XL", "XXL", "XXXL");
    /** Per size (same order as STANDARD_SIZES): chest, waist, hip, heightMin, heightMax, weightMin, weightMax. */
    private static final int[][] SIZE_CHART = {
            {80, 62, 84, 140, 155, 33, 45},
            {84, 66, 88, 145, 162, 38, 52},
            {90, 72, 94, 158, 170, 48, 62},
            {96, 78, 100, 166, 178, 58, 72},
            {102, 84, 106, 174, 190, 68, 90},
            {108, 90, 112, 176, 192, 80, 100},
            {114, 96, 118, 178, 194, 90, 110},
    };
    private static final int[] FREE_SIZE_ROW = {92, 74, 96, 150, 172, 42, 65};
    private static final Map<String, String> COLOR_HEX = Map.ofEntries(
            Map.entry("Trắng", "#FFFFFF"),
            Map.entry("Đen", "#111111"),
            Map.entry("Navy", "#1F2A44"),
            Map.entry("Beige", "#D8C3A5"),
            Map.entry("Olive", "#6B7B3A"),
            Map.entry("Xanh nhạt", "#A7C7E7"),
            Map.entry("Xanh dương", "#3B6FB6"),
            Map.entry("Xanh lá", "#4F7A4A"),
            Map.entry("Nâu", "#7B4B2A"),
            Map.entry("Xám", "#8E8E8E"),
            Map.entry("Cream", "#F3E9D2"),
            Map.entry("Kem", "#F3E9D2"),
            Map.entry("Champagne", "#E8D4B0"),
            Map.entry("Hồng", "#F2B8C6"),
            Map.entry("Đỏ", "#C62828"),
            Map.entry("Đỏ đô", "#7B1E2B"),
            Map.entry("Tím", "#8E6BBF"),
            Map.entry("Cam", "#E67E22"),
            Map.entry("Vàng", "#F2D16B"));
    private static final String DEFAULT_COLOR_HEX = "#333333";

    private final FashionCatalogLoader catalogLoader;
    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductTagRepository tagRepository;
    private final SizeChartRepository sizeChartRepository;
    private final CatalogMediaService catalogMediaService;
    private final ObjectMapper objectMapper;

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

    /**
     * Idempotent catalog sync, matched by marketplace item id. Products are updated in place (FK references
     * from recommendations, try-on, … stay valid) only while still catalog-managed and when their catalog
     * entry changed. Status is never touched on update, so products hidden, rejected or flagged stay that way;
     * catalog-managed products dropped from the catalog are hidden. Brand-created or brand-edited products
     * are left alone.
     */
    public void syncBrandCatalog(Brand brand, FashionCatalogLoader.BrandEntry entry) {
        List<Product> brandProducts = productRepository.findByBrandId(brand.getId());
        assignItemIdsOnce(brandProducts, entry);
        Map<String, Product> byItemId = new HashMap<>();
        for (Product product : brandProducts) {
            if (product.getCatalogItemId() != null) {
                byItemId.put(product.getCatalogItemId(), product);
            }
        }

        int created = 0;
        int updated = 0;
        int edited = 0;
        Set<String> wanted = new HashSet<>();
        int seq = 1;
        for (FashionCatalogLoader.ProductEntry productEntry : entry.products) {
            String itemId = requireItemId(entry.key, productEntry);
            wanted.add(itemId);
            Product product = byItemId.get(itemId);
            if (product == null) {
                createCatalogProduct(brand, entry.key, productEntry, seq);
                created++;
            } else if (!product.isCatalogManaged()) {
                edited++;
            } else if (!catalogHash(productEntry).equals(product.getCatalogHash())) {
                updateCatalogProduct(product, brand, entry.key, productEntry, seq);
                updated++;
            }
            seq++;
        }

        int hidden = 0;
        for (Product product : brandProducts) {
            boolean dropped = product.getCatalogItemId() == null || !wanted.contains(product.getCatalogItemId());
            if (product.isCatalogManaged() && dropped && product.getStatus() == ProductStatus.ACTIVE) {
                product.setStatus(ProductStatus.INACTIVE);
                productRepository.save(product);
                hidden++;
            }
        }

        if (created + updated + hidden > 0) {
            log.info("Synced catalog for {}: {} created, {} updated, {} hidden, {} kept as edited by the brand",
                    brand.getName(), created, updated, hidden, edited);
        }
    }

    /**
     * Databases seeded before item ids existed matched catalog entries by list position; link those rows to
     * their item ids once, in that same order (visible products first so the storefront keeps its products).
     */
    private void assignItemIdsOnce(List<Product> brandProducts, FashionCatalogLoader.BrandEntry entry) {
        if (brandProducts.stream().anyMatch(p -> p.getCatalogItemId() != null)) {
            return;
        }
        List<Product> legacy = brandProducts.stream()
                .filter(Product::isCatalogManaged)
                .sorted(Comparator.comparing((Product p) -> p.getStatus() != ProductStatus.ACTIVE)
                        .thenComparing(Product::getCreatedAt))
                .toList();
        int linked = Math.min(legacy.size(), entry.products.size());
        for (int i = 0; i < linked; i++) {
            Product product = legacy.get(i);
            product.setCatalogItemId(requireItemId(entry.key, entry.products.get(i)));
            productRepository.save(product);
        }
        if (linked > 0) {
            log.info("Linked {} existing products of {} to catalog item ids", linked, entry.name);
        }
    }

    private static String requireItemId(String brandKey, FashionCatalogLoader.ProductEntry entry) {
        if (entry.itemId == null || entry.itemId.isBlank()) {
            throw new IllegalStateException("Catalog product without itemId in " + brandKey + ": " + entry.name);
        }
        return entry.itemId.trim();
    }

    private String catalogHash(FashionCatalogLoader.ProductEntry entry) {
        try {
            return sha256(CATALOG_META_TAG + "\u0000" + objectMapper.writeValueAsString(entry));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot hash catalog entry " + entry.name, e);
        }
    }

    static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
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
        product.setPurchaseChannel(purchaseChannel(entry));
        product.setStockStatus(StockStatus.IN_STOCK);
        product.setSponsored(entry.sponsored);
        product.setCatalogHash(catalogHash(entry));

        String brandTryOnPick = currentTryOnImage(product.getId());
        clearRelatedData(product.getId());
        boolean hasTryOn = saveRelatedData(product.getId(), brandKey, entry, seq, brandTryOnPick);
        product.setAiTryOnEligible(hasTryOn && isTryOnCategory(entry.category));
        productRepository.save(product);
    }

    private String currentTryOnImage(UUID productId) {
        return imageRepository.findByProductIdOrderBySortOrderAsc(productId).stream()
                .filter(img -> ProductImage.TYPE_TRY_ON.equals(img.getImageType()))
                .map(ProductImage::getImageUrl)
                .findFirst()
                .orElse(null);
    }

    private static List<String> sizesOf(FashionCatalogLoader.ProductEntry entry) {
        return entry.sizes != null && !entry.sizes.isEmpty() ? entry.sizes : DEFAULT_SIZES;
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
        for (String size : sizesOf(entry)) {
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
                .sku("FITME-" + brandKey + "-" + seq + "-" + size.replace(' ', '-') + "-" + color.charAt(0))
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
                .purchaseChannel(purchaseChannel(entry))
                .stockStatus(StockStatus.IN_STOCK)
                .status(ProductStatus.ACTIVE)
                .isSponsored(entry.sponsored)
                .catalogItemId(requireItemId(brandKey, entry))
                .catalogManaged(true)
                .catalogHash(catalogHash(entry))
                .build());

        boolean hasTryOn = saveRelatedData(product.getId(), brandKey, entry, seq, null);
        product.setAiTryOnEligible(hasTryOn && isTryOnCategory(entry.category));
        productRepository.save(product);
    }

    private void clearRelatedData(UUID productId) {
        imageRepository.findByProductIdOrderBySortOrderAsc(productId).forEach(imageRepository::delete);
        tagRepository.findByProductId(productId).forEach(tagRepository::delete);
        sizeChartRepository.findByProductId(productId).forEach(sizeChartRepository::delete);
        // Hibernate flushes inserts before deletes; the one-TRY_ON-per-product index needs the deletes first.
        imageRepository.flush();
    }

    /**
     * Saves gallery, variants, tags and size chart. A try-on pick the brand made in the portal survives
     * catalog re-syncs while that photo is still in the gallery. Returns whether a try-on image was set.
     */
    private boolean saveRelatedData(
            UUID productId,
            String brandKey,
            FashionCatalogLoader.ProductEntry entry,
            int seq,
            String brandTryOnPick) {
        List<String> sourceUrls = galleryOf(entry);
        String tryOnSource = null;
        if (isTryOnCategory(entry.category)) {
            tryOnSource = sourceUrls.stream()
                    .filter(source -> catalogMediaService.refersTo(brandTryOnPick, source))
                    .findFirst()
                    .orElse(entry.tryOnImage);
        }

        boolean tryOnSaved = false;
        for (int i = 0; i < sourceUrls.size(); i++) {
            String source = sourceUrls.get(i);
            boolean isTryOn = !tryOnSaved && source.equals(tryOnSource);
            tryOnSaved |= isTryOn;
            imageRepository.save(ProductImage.builder()
                    .productId(productId)
                    .imageUrl(catalogMediaService.resolve(source))
                    .imageType(isTryOn ? ProductImage.TYPE_TRY_ON : i == 0 ? ProductImage.TYPE_MAIN : ProductImage.TYPE_DETAIL)
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
                .tagValue(targetGender(entry).name())
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

        List<String> sizes = sizesOf(entry);
        for (int i = 0; i < sizes.size(); i++) {
            int[] row = sizeChartRow(sizes.get(i), i);
            sizeChartRepository.save(SizeChart.builder()
                    .productId(productId)
                    .sizeLabel(sizes.get(i))
                    .chestCm(BigDecimal.valueOf(row[0]))
                    .waistCm(BigDecimal.valueOf(row[1]))
                    .hipCm(BigDecimal.valueOf(row[2]))
                    .heightMinCm(row[3])
                    .heightMaxCm(row[4])
                    .weightMinKg(BigDecimal.valueOf(row[5]))
                    .weightMaxKg(BigDecimal.valueOf(row[6]))
                    .build());
        }
        return tryOnSaved;
    }

    private List<String> galleryOf(FashionCatalogLoader.ProductEntry entry) {
        List<String> imageUrls = entry.images != null && !entry.images.isEmpty()
                ? entry.images
                : catalogLoader.load().images != null ? catalogLoader.load().images.get(entry.imageKey) : null;
        if (imageUrls == null || imageUrls.isEmpty()) {
            throw new IllegalStateException("No images for catalog product: " + entry.name);
        }
        return imageUrls;
    }

    /** Standard letter sizes use the graduated chart; other labels (jeans waist, free size) follow list order. */
    private static int[] sizeChartRow(String size, int index) {
        String label = size.trim().toUpperCase();
        int standard = STANDARD_SIZES.indexOf(label);
        if (standard >= 0) {
            return SIZE_CHART[standard];
        }
        if (label.startsWith("FREE")) {
            return FREE_SIZE_ROW;
        }
        return SIZE_CHART[Math.min(index + 1, SIZE_CHART.length - 1)];
    }

    private static ProductTargetGender targetGender(FashionCatalogLoader.ProductEntry entry) {
        if (entry.targetGender != null) {
            try {
                return ProductTargetGender.valueOf(entry.targetGender);
            } catch (IllegalArgumentException ignored) {
                // fall through to inference
            }
        }
        return inferTargetGender(entry);
    }

    private static PurchaseChannel purchaseChannel(FashionCatalogLoader.ProductEntry entry) {
        if (entry.purchaseChannel != null && UrlValidator.isValidHttpUrl(entry.purchaseUrl)) {
            try {
                return PurchaseChannel.valueOf(entry.purchaseChannel);
            } catch (IllegalArgumentException ignored) {
                // fall through to the brand website
            }
        }
        return PurchaseChannel.BRAND_WEBSITE;
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
        return !"Phụ kiện".equals(category) && !"Giày".equals(category);
    }

    /**
     * The catalog's own listing URL (e.g. the Shopee product page) when valid; otherwise the brand's
     * website, else https://{brandKey}.vn.
     */
    static String purchaseUrl(Brand brand, String brandKey, FashionCatalogLoader.ProductEntry entry) {
        if (UrlValidator.isValidHttpUrl(entry.purchaseUrl)) {
            return entry.purchaseUrl.trim();
        }
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
