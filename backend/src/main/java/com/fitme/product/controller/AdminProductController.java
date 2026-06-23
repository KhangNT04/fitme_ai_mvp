package com.fitme.product.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.product.dto.ProductResponse;
import com.fitme.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/products")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductController {

    private final ProductService productService;

    @GetMapping("/pending")
    public ApiResponse<List<ProductResponse>> pending() {
        return ApiResponse.ok(productService.listPendingProducts());
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<ProductResponse> approve(@PathVariable UUID id) {
        return ApiResponse.ok(productService.approveProduct(id));
    }

    @PostMapping("/{id}/reject")
    public ApiResponse<ProductResponse> reject(@PathVariable UUID id) {
        return ApiResponse.ok(productService.rejectProduct(id));
    }

    @PostMapping("/{id}/flag")
    public ApiResponse<ProductResponse> flag(@PathVariable UUID id) {
        return ApiResponse.ok(productService.flagProduct(id));
    }
}
