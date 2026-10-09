package com.fitme.product.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.brandplus.service.BrandPlusService;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.util.UrlValidator;
import com.fitme.common.exception.NotFoundException;
import com.fitme.product.dto.*;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.entity.SizeChart;
import com.fitme.product.repository.*;
import com.fitme.product.util.ProductCategoryGroups;
import com.fitme.settings.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductTagRepository tagRepository;
    private final SizeChartRepository sizeChartRepository;
    private final BrandRepository brandRepository;
    private final ProductEligibilityService eligibilityService;
    private final BrandPlusService brandPlusService;
    private final SystemSettingsService settingsService;

    public List<ProductResponse> listPublicProducts(ProductFilter filter) {
        Set<UUID> plusBrandIds = brandPlusService.activePlusBrandIds();
        return productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(p -> isBrandApproved(p.getBrandId()))
                .filter(p -> matchesFilter(p, filter))
                .map(p -> toResponse(p, plusBrandIds.contains(p.getBrandId())))
                .toList();
    }

    public ProductResponse getPublicProduct(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        if (product.getStatus() != ProductStatus.ACTIVE || !isBrandApproved(product.getBrandId())) {
            throw new NotFoundException("Sản phẩm không khả dụng");
        }
        return toResponse(product);
    }

    /** Same category group; Brand Plus products come first unless the admin turned the Plus boost off. */
    public List<ProductResponse> getSimilarProducts(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        Set<UUID> plusBrandIds = brandPlusService.activePlusBrandIds();
        boolean prioritizePlus = settingsService.recommendationPlusBoost() > 0;
        Comparator<Product> plusFirst = Comparator.comparing(
                (Product p) -> prioritizePlus && plusBrandIds.contains(p.getBrandId()));
        return productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(p -> !p.getId().equals(id))
                .filter(p -> isBrandApproved(p.getBrandId()))
                .filter(p -> ProductCategoryGroups.sameGroup(p.getCategory(), product.getCategory()))
                .sorted(plusFirst.reversed())
                .limit(8)
                .map(p -> toResponse(p, plusBrandIds.contains(p.getBrandId())))
                .toList();
    }

    public List<ProductResponse> listBrandProducts(UUID brandId) {
        boolean plusBrand = brandPlusService.isPlusActive(brandId);
        return productRepository.findByBrandId(brandId).stream()
                .map(p -> toResponse(p, plusBrand))
                .toList();
    }

    public ProductResponse getBrandProduct(UUID brandId, UUID productId) {
        Product product = getOwnedProduct(brandId, productId);
        return toResponse(product);
    }

    @Transactional
    public ProductResponse createProduct(UUID brandId, CreateProductRequest request) {
        requireValidPurchaseUrl(request.getPurchaseUrl());
        Product product = Product.builder()
                .brandId(brandId)
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .price(request.getPrice())
                .material(request.getMaterial())
                .fitType(request.getFitType())
                .purchaseUrl(request.getPurchaseUrl())
                .purchaseChannel(request.getPurchaseChannel())
                .stockStatus(request.getStockStatus() != null ? request.getStockStatus() : com.fitme.common.enums.StockStatus.IN_STOCK)
                .status(ProductStatus.DRAFT)
                .build();
        product = productRepository.save(product);
        saveRelated(product.getId(), request);
        updateAiEligibility(product);
        return toResponse(productRepository.findById(product.getId()).orElseThrow());
    }

    @Transactional
    public ProductResponse updateProduct(UUID brandId, UUID productId, CreateProductRequest request) {
        Product product = getOwnedProduct(brandId, productId);
        requireValidPurchaseUrl(request.getPurchaseUrl());
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setCategory(request.getCategory());
        product.setPrice(request.getPrice());
        product.setMaterial(request.getMaterial());
        product.setFitType(request.getFitType());
        product.setPurchaseUrl(request.getPurchaseUrl());
        product.setPurchaseChannel(request.getPurchaseChannel());
        if (request.getStockStatus() != null) {
            product.setStockStatus(request.getStockStatus());
        }
        product.setCatalogManaged(false);
        productRepository.save(product);
        imageRepository.findByProductIdOrderBySortOrderAsc(productId).forEach(imageRepository::delete);
        tagRepository.findByProductId(productId).stream()
                .filter(tag -> !isSystemTag(tag.getTagType()))
                .forEach(tagRepository::delete);
        sizeChartRepository.findByProductId(productId).forEach(sizeChartRepository::delete);
        // Hibernate flushes inserts before deletes; the one-TRY_ON-per-product index needs the deletes first.
        imageRepository.flush();
        saveImagesTagsAndSizeCharts(productId, request);
        if (request.getVariants() != null) {
            syncVariants(productId, request.getVariants());
        }
        updateAiEligibility(product);
        return toResponse(product);
    }

    /**
     * Existing variants are matched by id, else by colour + size, so they keep their id;
     * variants dropped from the request are deleted.
     */
    private void syncVariants(UUID productId, List<ProductVariantDto> requested) {
        List<ProductVariant> existing = variantRepository.findByProductId(productId);
        Map<UUID, ProductVariant> byId = new HashMap<>();
        Map<String, ProductVariant> byKey = new HashMap<>();
        for (ProductVariant variant : existing) {
            byId.put(variant.getId(), variant);
            byKey.putIfAbsent(variantKey(variant.getColorName(), variant.getSizeLabel()), variant);
        }

        Set<UUID> kept = new HashSet<>();
        for (ProductVariantDto dto : requested) {
            ProductVariant variant = dto.getId() != null ? byId.get(dto.getId()) : null;
            if (variant == null) {
                variant = byKey.get(variantKey(dto.getColorName(), dto.getSizeLabel()));
            }
            if (variant == null || kept.contains(variant.getId())) {
                kept.add(variantRepository.save(newVariant(productId, dto)).getId());
                continue;
            }
            variant.setColorName(dto.getColorName());
            if (dto.getColorHex() != null) {
                variant.setColorHex(dto.getColorHex());
            }
            variant.setSizeLabel(dto.getSizeLabel());
            if (dto.getSku() != null) {
                variant.setSku(dto.getSku());
            }
            if (dto.getStockStatus() != null) {
                variant.setStockStatus(dto.getStockStatus());
            }
            kept.add(variantRepository.save(variant).getId());
        }

        existing.stream()
                .filter(variant -> !kept.contains(variant.getId()))
                .forEach(variantRepository::delete);
    }

    private static String variantKey(String color, String size) {
        return (color == null ? "" : color.trim().toLowerCase()) + "|" + (size == null ? "" : size.trim().toLowerCase());
    }

    private static ProductVariant newVariant(UUID productId, ProductVariantDto v) {
        return ProductVariant.builder()
                .productId(productId)
                .colorName(v.getColorName())
                .colorHex(v.getColorHex())
                .sizeLabel(v.getSizeLabel())
                .sku(v.getSku())
                .stockStatus(v.getStockStatus() != null ? v.getStockStatus() : com.fitme.common.enums.StockStatus.IN_STOCK)
                .build();
    }

    @Transactional
    public void hideProduct(UUID brandId, UUID productId) {
        Product product = getOwnedProduct(brandId, productId);
        if (product.getStatus() == ProductStatus.INACTIVE) {
            throw new BusinessException("Sản phẩm đã được ẩn");
        }
        product.setStatus(ProductStatus.INACTIVE);
        productRepository.save(product);
    }

    @Transactional
    public void permanentlyDeleteProduct(UUID brandId, UUID productId) {
        Product product = getOwnedProduct(brandId, productId);
        if (product.getStatus() != ProductStatus.INACTIVE) {
            throw new BusinessException("Chỉ có thể xóa vĩnh viễn sản phẩm đã ẩn (Tạm ẩn)");
        }
        clearRelated(productId);
        productRepository.delete(product);
    }

    @Transactional
    public ProductResponse submitForReview(UUID brandId, UUID productId) {
        Product product = getOwnedProduct(brandId, productId);
        product.setStatus(ProductStatus.PENDING_REVIEW);
        productRepository.save(product);
        return toResponse(product);
    }

    public List<ProductResponse> listPendingProducts() {
        return toResponses(productRepository.findByStatus(ProductStatus.PENDING_REVIEW));
    }

    public List<ProductResponse> listFlaggedProducts() {
        return toResponses(productRepository.findByStatus(ProductStatus.FLAGGED));
    }

    private List<ProductResponse> toResponses(List<Product> products) {
        Set<UUID> plusBrandIds = brandPlusService.activePlusBrandIds();
        return products.stream()
                .map(p -> toResponse(p, plusBrandIds.contains(p.getBrandId())))
                .toList();
    }

    public ProductResponse getAdminProduct(UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        return toResponse(product);
    }

    @Transactional
    public ProductResponse approveProduct(UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        java.util.List<String> issues = eligibilityService.getModerationIssues(product);
        if (issues.stream().anyMatch(ProductEligibilityService::isBlockingModerationIssue)) {
            throw new BusinessException("Không thể duyệt: " + String.join(", ", issues));
        }
        product.setStatus(ProductStatus.ACTIVE);
        updateAiEligibility(product);
        Product saved = productRepository.save(product);
        replaceReasonTag(productId, "REJECT_REASON", null);
        return toResponse(saved);
    }

    @Transactional
    public ProductResponse rejectProduct(UUID productId, String reason) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        product.setStatus(ProductStatus.REJECTED);
        productRepository.save(product);
        replaceReasonTag(productId, "REJECT_REASON", reason);
        return toResponse(product);
    }

    private static void requireValidPurchaseUrl(String purchaseUrl) {
        if (!UrlValidator.isValidHttpUrl(purchaseUrl)) {
            throw new BusinessException(
                    "Link mua hàng không hợp lệ, cần dạng https://... tới trang sản phẩm của cửa hàng",
                    "INVALID_PURCHASE_URL");
        }
    }

    private void replaceReasonTag(UUID productId, String tagType, String reason) {
        tagRepository.findByProductId(productId).stream()
                .filter(t -> tagType.equals(t.getTagType()))
                .forEach(tagRepository::delete);
        if (reason != null && !reason.isBlank()) {
            tagRepository.save(ProductTag.builder()
                    .productId(productId)
                    .tagType(tagType)
                    .tagValue(reason.trim())
                    .build());
        }
    }

    @Transactional
    public ProductResponse flagProduct(UUID productId, String reason) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        product.setStatus(ProductStatus.FLAGGED);
        productRepository.save(product);
        replaceReasonTag(productId, "FLAG_REASON", reason);
        return toResponse(product);
    }

    public Product getEntity(UUID id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
    }

    private Product getOwnedProduct(UUID brandId, UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        if (!product.getBrandId().equals(brandId)) {
            throw new BusinessException("Sản phẩm không thuộc brand của bạn");
        }
        return product;
    }

    private void clearRelated(UUID productId) {
        imageRepository.findByProductIdOrderBySortOrderAsc(productId).forEach(imageRepository::delete);
        variantRepository.findByProductId(productId).forEach(variantRepository::delete);
        tagRepository.findByProductId(productId).forEach(tagRepository::delete);
        sizeChartRepository.findByProductId(productId).forEach(sizeChartRepository::delete);
    }

    private void saveRelated(UUID productId, CreateProductRequest request) {
        saveImagesTagsAndSizeCharts(productId, request);
        if (request.getVariants() != null) {
            for (ProductVariantDto v : request.getVariants()) {
                variantRepository.save(newVariant(productId, v));
            }
        }
    }

    private void saveImagesTagsAndSizeCharts(UUID productId, CreateProductRequest request) {
        if (request.getImages() != null) {
            int order = 0;
            int tryOnIndex = tryOnImageIndex(request);
            for (int i = 0; i < request.getImages().size(); i++) {
                ProductImageDto img = request.getImages().get(i);
                String type = img.getImageType() != null ? img.getImageType() : ProductImage.TYPE_MAIN;
                if (i == tryOnIndex) {
                    type = ProductImage.TYPE_TRY_ON;
                } else if (ProductImage.TYPE_TRY_ON.equalsIgnoreCase(type)) {
                    type = ProductImage.TYPE_DETAIL;
                }
                imageRepository.save(ProductImage.builder()
                        .productId(productId)
                        .imageUrl(img.getImageUrl())
                        .imageType(type)
                        .sortOrder(img.getSortOrder() != null ? img.getSortOrder() : order++)
                        .build());
            }
        }
        if (request.getTags() != null) {
            for (ProductTagDto t : request.getTags()) {
                if (isSystemTag(t.getTagType())) {
                    continue;
                }
                tagRepository.save(ProductTag.builder()
                        .productId(productId)
                        .tagType(t.getTagType())
                        .tagValue(t.getTagValue())
                        .build());
            }
        }
        if (request.getSizeCharts() != null) {
            for (SizeChartDto sc : request.getSizeCharts()) {
                sizeChartRepository.save(SizeChart.builder()
                        .productId(productId)
                        .sizeLabel(sc.getSizeLabel())
                        .chestCm(sc.getChestCm())
                        .waistCm(sc.getWaistCm())
                        .hipCm(sc.getHipCm())
                        .shoulderCm(sc.getShoulderCm())
                        .lengthCm(sc.getLengthCm())
                        .inseamCm(sc.getInseamCm())
                        .weightMinKg(sc.getWeightMinKg())
                        .weightMaxKg(sc.getWeightMaxKg())
                        .heightMinCm(sc.getHeightMinCm())
                        .heightMaxCm(sc.getHeightMaxCm())
                        .note(sc.getNote())
                        .build());
            }
        }
    }

    /**
     * Index of the single TRY_ON image: the brand's pick, else the first photo. Shoes and accessories
     * are outside VTON scope and get none (-1).
     */
    private static int tryOnImageIndex(CreateProductRequest request) {
        List<ProductImageDto> images = request.getImages();
        if (images.isEmpty() || ProductEligibilityService.isOutsideVtonScope(request.getCategory())) {
            return -1;
        }
        for (int i = 0; i < images.size(); i++) {
            if (ProductImage.TYPE_TRY_ON.equalsIgnoreCase(images.get(i).getImageType())) {
                return i;
            }
        }
        return 0;
    }

    /** META tags are written by the catalog seeder; brands can neither send nor erase them. */
    private static boolean isSystemTag(String tagType) {
        return "META".equals(tagType);
    }

    private void updateAiEligibility(Product product) {
        product.setAiTryOnEligible(eligibilityService.canBeUsedForAiTryOn(product));
        productRepository.save(product);
    }

    private boolean isBrandApproved(UUID brandId) {
        return brandRepository.findById(brandId)
                .map(b -> b.getStatus() == BrandStatus.APPROVED)
                .orElse(false);
    }

    private boolean matchesFilter(Product p, ProductFilter filter) {
        if (filter == null) return true;
        if (filter.getBrandId() != null && !filter.getBrandId().equals(p.getBrandId())) return false;
        if (filter.getCategory() != null && !ProductCategoryGroups.matchesGroup(p.getCategory(), filter.getCategory())) {
            return false;
        }
        if (filter.getPriceMin() != null && p.getPrice() != null && p.getPrice().compareTo(filter.getPriceMin()) < 0) return false;
        if (filter.getPriceMax() != null && p.getPrice() != null && p.getPrice().compareTo(filter.getPriceMax()) > 0) return false;
        if (filter.getFitType() != null && p.getFitType() != filter.getFitType()) return false;
        if (filter.isAiTryOnEligible() && !p.isAiTryOnEligible()) return false;
        if (filter.getStyle() != null || filter.getOccasion() != null || filter.getColor() != null || filter.getSize() != null) {
            List<ProductTag> tags = tagRepository.findByProductId(p.getId());
            if (filter.getStyle() != null && tags.stream().noneMatch(t -> "STYLE".equals(t.getTagType()) && t.getTagValue().equalsIgnoreCase(filter.getStyle()))) return false;
            if (filter.getOccasion() != null && tags.stream().noneMatch(t -> "OCCASION".equals(t.getTagType()) && t.getTagValue().equalsIgnoreCase(filter.getOccasion()))) return false;
            if (filter.getColor() != null && variantRepository.findByProductId(p.getId()).stream().noneMatch(v -> filter.getColor().equalsIgnoreCase(v.getColorName()))) return false;
            if (filter.getSize() != null && variantRepository.findByProductId(p.getId()).stream().noneMatch(v -> filter.getSize().equalsIgnoreCase(v.getSizeLabel()))) return false;
        }
        if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
            String q = filter.getSearch().trim().toLowerCase();
            String brandName = brandRepository.findById(p.getBrandId()).map(Brand::getName).orElse("");
            boolean brandMatch = brandName.toLowerCase().contains(q);
            boolean productMatch =
                    (p.getName() != null && p.getName().toLowerCase().contains(q))
                            || (p.getDescription() != null && p.getDescription().toLowerCase().contains(q))
                            || (p.getCategory() != null && p.getCategory().toLowerCase().contains(q));
            if (!brandMatch && !productMatch) return false;
        }
        return true;
    }

    public ProductResponse toResponse(Product product) {
        return toResponse(product, brandPlusService.isPlusActive(product.getBrandId()));
    }

    private ProductResponse toResponse(Product product, boolean plusBrand) {
        UUID productId = product.getId();
        String brandName = brandRepository.findById(product.getBrandId()).map(Brand::getName).orElse(null);
        return ProductResponse.builder()
                .id(productId)
                .brandId(product.getBrandId())
                .brandName(brandName)
                .plusBrand(plusBrand)
                .name(product.getName())
                .description(product.getDescription())
                .category(product.getCategory())
                .price(product.getPrice())
                .currency(product.getCurrency())
                .material(product.getMaterial())
                .fitType(product.getFitType())
                .purchaseUrl(product.getPurchaseUrl())
                .purchaseChannel(product.getPurchaseChannel())
                .stockStatus(product.getStockStatus())
                .status(product.getStatus())
                .sponsored(product.isSponsored())
                .aiTryOnEligible(product.isAiTryOnEligible())
                .canShowBuyButton(eligibilityService.canShowBuyButton(product))
                .images(imageRepository.findByProductIdOrderBySortOrderAsc(productId).stream()
                        .map(i -> ProductImageDto.builder().imageUrl(i.getImageUrl()).imageType(i.getImageType()).sortOrder(i.getSortOrder()).build())
                        .toList())
                .variants(variantRepository.findByProductId(productId).stream()
                        .map(v -> ProductVariantDto.builder().id(v.getId()).colorName(v.getColorName()).colorHex(v.getColorHex())
                                .sizeLabel(v.getSizeLabel()).sku(v.getSku()).stockStatus(v.getStockStatus())
                                .build())
                        .toList())
                .tags(tagRepository.findByProductId(productId).stream()
                        .map(t -> ProductTagDto.builder().tagType(t.getTagType()).tagValue(t.getTagValue()).build())
                        .toList())
                .sizeCharts(sizeChartRepository.findByProductId(productId).stream()
                        .map(sc -> SizeChartDto.builder()
                                .sizeLabel(sc.getSizeLabel())
                                .chestCm(sc.getChestCm())
                                .waistCm(sc.getWaistCm())
                                .hipCm(sc.getHipCm())
                                .shoulderCm(sc.getShoulderCm())
                                .lengthCm(sc.getLengthCm())
                                .inseamCm(sc.getInseamCm())
                                .weightMinKg(sc.getWeightMinKg())
                                .weightMaxKg(sc.getWeightMaxKg())
                                .heightMinCm(sc.getHeightMinCm())
                                .heightMaxCm(sc.getHeightMaxCm())
                                .note(sc.getNote())
                                .build())
                        .toList())
                .createdAt(product.getCreatedAt())
                .build();
    }

    @lombok.Data
    public static class ProductFilter {
        private UUID brandId;
        private String category;
        private BigDecimal priceMin;
        private BigDecimal priceMax;
        private String style;
        private String occasion;
        private String color;
        private com.fitme.common.enums.FitPreference fitType;
        private String size;
        private String search;
        private boolean aiTryOnEligible;
    }
}
