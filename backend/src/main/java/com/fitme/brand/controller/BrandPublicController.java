package com.fitme.brand.controller;

import com.fitme.brand.dto.BrandResponse;
import com.fitme.brand.service.BrandService;
import com.fitme.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brands")
@RequiredArgsConstructor
public class BrandPublicController {

    private final BrandService brandService;

    @GetMapping
    public ApiResponse<List<BrandResponse>> list() {
        return ApiResponse.ok(brandService.listPublicBrands());
    }

    @GetMapping("/{id}")
    public ApiResponse<BrandResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(brandService.getPublicBrand(id));
    }
}
