package com.fitme.product.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.service.BrandService;
import com.fitme.product.dto.CreateProductRequest;
import com.fitme.product.dto.ProductResponse;
import com.fitme.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand/products")
@RequiredArgsConstructor
public class BrandProductController {

    private final ProductService productService;
    private final BrandService brandService;

    @GetMapping
    public ApiResponse<List<ProductResponse>> list(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(productService.listBrandProducts(requireBrand(principal).getId()));
    }

    @PostMapping
    public ApiResponse<ProductResponse> create(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                               @Valid @RequestBody CreateProductRequest request) {
        return ApiResponse.ok(productService.createProduct(requireBrand(principal).getId(), request));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductResponse> get(@AuthenticationPrincipal FitMeUserPrincipal principal, @PathVariable UUID id) {
        return ApiResponse.ok(productService.getBrandProduct(requireBrand(principal).getId(), id));
    }

    @PutMapping("/{id}")
    public ApiResponse<ProductResponse> update(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                             @PathVariable UUID id,
                                             @Valid @RequestBody CreateProductRequest request) {
        return ApiResponse.ok(productService.updateProduct(requireBrand(principal).getId(), id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal FitMeUserPrincipal principal, @PathVariable UUID id) {
        productService.permanentlyDeleteProduct(requireBrand(principal).getId(), id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/hide")
    public ApiResponse<Void> hide(@AuthenticationPrincipal FitMeUserPrincipal principal, @PathVariable UUID id) {
        productService.hideProduct(requireBrand(principal).getId(), id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/submit-review")
    public ApiResponse<ProductResponse> submitReview(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                     @PathVariable UUID id) {
        return ApiResponse.ok(productService.submitForReview(requireBrand(principal).getId(), id));
    }

    private Brand requireBrand(FitMeUserPrincipal principal) {
        if (principal == null) {
            throw new BusinessException("Yêu cầu đăng nhập brand owner");
        }
        return brandService.getBrandForOwner(principal.getUserId());
    }
}
