package com.fitme.brandlead.controller;

import com.fitme.brand.service.BrandService;
import com.fitme.brandlead.dto.BrandLeadDto;
import com.fitme.brandlead.dto.BrandLeadPage;
import com.fitme.brandlead.dto.MarkLeadSoldRequest;
import com.fitme.brandlead.service.BrandLeadService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand/leads")
@RequiredArgsConstructor
public class BrandLeadController {

    private final BrandService brandService;
    private final BrandLeadService brandLeadService;

    @GetMapping
    public ApiResponse<BrandLeadPage> list(
            @AuthenticationPrincipal FitMeUserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID productId,
            @RequestParam(required = false) Boolean sold,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(brandLeadService.list(brandId(principal), from, to, productId, sold, page, size));
    }

    @PatchMapping("/{id}/sold")
    public ApiResponse<BrandLeadDto> markSold(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                              @PathVariable UUID id,
                                              @Valid @RequestBody MarkLeadSoldRequest request) {
        return ApiResponse.ok(brandLeadService.markSold(brandId(principal), principal.getUserId(), id,
                request.getSold()));
    }

    private UUID brandId(FitMeUserPrincipal principal) {
        return brandService.getBrandForOwner(principal.getUserId()).getId();
    }
}
