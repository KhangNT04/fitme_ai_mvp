package com.fitme.brandplus.controller;

import com.fitme.brand.service.BrandService;
import com.fitme.brandplus.dto.BrandBillingOrderDto;
import com.fitme.brandplus.dto.BrandPlusCheckoutRequest;
import com.fitme.brandplus.dto.BrandPlusCheckoutResponse;
import com.fitme.brandplus.dto.BrandPlusQuoteDto;
import com.fitme.brandplus.dto.BrandPlusStatusDto;
import com.fitme.brandplus.service.BrandPlusService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand/plan")
@RequiredArgsConstructor
public class BrandPlusController {

    private final BrandService brandService;
    private final BrandPlusService brandPlusService;

    @GetMapping
    public ApiResponse<BrandPlusStatusDto> status(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(brandPlusService.status(brandId(principal)));
    }

    @GetMapping("/quote")
    public ApiResponse<BrandPlusQuoteDto> quote(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                @RequestParam(required = false) UUID voucherId) {
        return ApiResponse.ok(brandPlusService.quote(brandId(principal), voucherId));
    }

    @PostMapping("/checkout")
    public ApiResponse<BrandPlusCheckoutResponse> checkout(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                           @RequestBody(required = false) BrandPlusCheckoutRequest request) {
        return ApiResponse.ok(brandPlusService.checkout(brandId(principal), principal.getUserId(),
                request != null ? request.getVoucherId() : null));
    }

    @GetMapping("/orders/{orderCode}")
    public ApiResponse<BrandBillingOrderDto> order(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                   @PathVariable long orderCode) {
        return ApiResponse.ok(brandPlusService.getOrder(brandId(principal), orderCode));
    }

    @PostMapping("/orders/{orderCode}/cancel")
    public ApiResponse<BrandBillingOrderDto> cancel(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                    @PathVariable long orderCode) {
        return ApiResponse.ok(brandPlusService.cancelOrder(brandId(principal), orderCode));
    }

    private UUID brandId(FitMeUserPrincipal principal) {
        return brandService.getBrandForOwner(principal.getUserId()).getId();
    }
}
