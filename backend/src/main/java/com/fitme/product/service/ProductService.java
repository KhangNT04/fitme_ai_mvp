package com.fitme.product.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.product.dto.*;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.entity.SizeChart;
import com.fitme.product.repository.*;
import com.fitme.product.util.ProductCategoryGroups;
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

    public List<ProductResponse> listPublicProducts(ProductFilter filter) {
        return productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(p -> isBrandApproved(p.getBrandId()))
                .filter(p -> matchesFilter(p, filter))
                .map(this::toResponse)
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

    public List<ProductResponse> getSimilarProducts(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        return productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(p -> !p.getId().equals(id))
                .filter(p -> isBrandApproved(p.getBrandId()))
                .filter(p -> ProductCategoryGroups.sameGroup(p.getCategory(), product.getCategory()))
                .limit(8)
                .map(this::toResponse)
                .toList();
    }

    public List<ProductResponse> listBrandProducts(UUID brandId) {
        return productRepository.findByBrandId(brandId).stream()
                .map(this::toResponse)
                .toList();
    }

    public ProductResponse getBrandProduct(UUID brandId, UUID productId) {
        Product product = getOwnedProduct(brandId, productId);
        return toResponse(product);
    }

    @Transactional
    public ProductResponse createProduct(UUID brandId, CreateProductRequest request) {
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
        productRepository.save(product);
        clearRelated(productId);
        saveRelated(productId, request);
        updateAiEligibility(product);
        return toResponse(product);
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
        return productRepository.findByStatus(ProductStatus.PENDING_REVIEW).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ProductResponse> listFlaggedProducts() {
        return productRepository.findByStatus(ProductStatus.FLAGGED).stream()
                .map(this::toResponse)
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
        java.util.List<String> issues = eligibilityService.getModerationIssues(productId);
        if (issues.stream().anyMatch(i -> i.contains("Thiếu ảnh"))) {
            throw new BusinessException("Không thể duyệt: " + String.join(", ", issues));
        }
        product.setStatus(ProductStatus.ACTIVE);
        updateAiEligibility(product);
        return toResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse rejectProduct(UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        product.setStatus(ProductStatus.REJECTED);
        return toResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse flagProduct(UUID productId, String reason) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        product.setStatus(ProductStatus.FLAGGED);
        productRepository.save(product);
        tagRepository.findByProductId(productId).stream()
                .filter(t -> "FLAG_REASON".equals(t.getTagType()))
                .forEach(tagRepository::delete);
        if (reason != null && !reason.isBlank()) {
            tagRepository.save(ProductTag.builder()
                    .productId(productId)
                    .tagType("FLAG_REASON")
                    .tagValue(reason.trim())
                    .build());
        }
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
        if (request.getImages() != null) {
            int order = 0;
            for (ProductImageDto img : request.getImages()) {
                imageRepository.save(ProductImage.builder()
                        .productId(productId)
                        .imageUrl(img.getImageUrl())
                        .imageType(img.getImageType() != null ? img.getImageType() : "MAIN")
                        .sortOrder(img.getSortOrder() != null ? img.getSortOrder() : order++)
                        .build());
            }
        }
        if (request.getVariants() != null) {
            for (ProductVariantDto v : request.getVariants()) {
                variantRepository.save(ProductVariant.builder()
                        .productId(productId)
                        .colorName(v.getColorName())
                        .colorHex(v.getColorHex())
                        .sizeLabel(v.getSizeLabel())
                        .sku(v.getSku())
                        .stockStatus(v.getStockStatus() != null ? v.getStockStatus() : com.fitme.common.enums.StockStatus.IN_STOCK)
                        .build());
            }
        }
        if (request.getTags() != null) {
            for (ProductTagDto t : request.getTags()) {
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
        UUID productId = product.getId();
        String brandName = brandRepository.findById(product.getBrandId()).map(Brand::getName).orElse(null);
        return ProductResponse.builder()
                .id(productId)
                .brandId(product.getBrandId())
                .brandName(brandName)
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
                        .map(v -> ProductVariantDto.builder().colorName(v.getColorName()).colorHex(v.getColorHex())
                                .sizeLabel(v.getSizeLabel()).sku(v.getSku()).stockStatus(v.getStockStatus()).build())
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
