package com.fitme.brandplus.controller;

import com.fitme.brandplus.dto.AdminBrandSubscriptionDto;
import com.fitme.brandplus.service.BrandPlusService;
import com.fitme.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/brand-subscriptions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminBrandPlusController {

    private final BrandPlusService brandPlusService;

    @GetMapping
    public ApiResponse<List<AdminBrandSubscriptionDto>> list() {
        return ApiResponse.ok(brandPlusService.adminList());
    }
}
