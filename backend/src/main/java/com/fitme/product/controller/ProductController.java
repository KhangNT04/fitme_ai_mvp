package com.fitme.product.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.enums.FitPreference;
import com.fitme.product.dto.ProductResponse;
import com.fitme.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ApiResponse<List<ProductResponse>> list(
            @RequestParam(required = false) UUID brandId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) BigDecimal priceMin,
            @RequestParam(required = false) BigDecimal priceMax,
            @RequestParam(required = false) String style,
            @RequestParam(required = false) String occasion,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) FitPreference fitType,
            @RequestParam(required = false) String size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "false") boolean aiTryOnEligible) {
        ProductService.ProductFilter filter = new ProductService.ProductFilter();
        filter.setBrandId(brandId);
        filter.setCategory(category);
        filter.setPriceMin(priceMin);
        filter.setPriceMax(priceMax);
        filter.setStyle(style);
        filter.setOccasion(occasion);
        filter.setColor(color);
        filter.setFitType(fitType);
        filter.setSize(size);
        filter.setSearch(search);
        filter.setAiTryOnEligible(aiTryOnEligible);
        return ApiResponse.ok(productService.listPublicProducts(filter));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(productService.getPublicProduct(id));
    }

    @GetMapping("/{id}/similar")
    public ApiResponse<List<ProductResponse>> similar(@PathVariable UUID id) {
        return ApiResponse.ok(productService.getSimilarProducts(id));
    }
}
