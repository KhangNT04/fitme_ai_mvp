package com.fitme.brandvoucher.controller;

import com.fitme.brand.service.BrandService;
import com.fitme.brandvoucher.dto.BrandVoucherDto;
import com.fitme.brandvoucher.service.BrandVoucherService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/brand/vouchers")
@RequiredArgsConstructor
public class BrandVoucherController {

    private final BrandService brandService;
    private final BrandVoucherService brandVoucherService;

    @GetMapping
    public ApiResponse<List<BrandVoucherDto>> list(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(brandVoucherService.listForBrand(
                brandService.getBrandForOwner(principal.getUserId()).getId()));
    }
}
