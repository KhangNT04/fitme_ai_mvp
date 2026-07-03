package com.fitme.admin.controller;

import com.fitme.admin.dto.AdminBrandListItemDto;
import com.fitme.admin.dto.ConsentRecordDto;
import com.fitme.admin.dto.DataDeletionRequestDto;
import com.fitme.admin.dto.OccasionRuleDto;
import com.fitme.admin.dto.OccasionRuleRequest;
import com.fitme.admin.dto.PreviewGenerationDto;
import com.fitme.admin.dto.StyleRuleDto;
import com.fitme.admin.dto.StyleRuleRequest;
import com.fitme.admin.service.AdminBrandListService;
import com.fitme.admin.service.AdminDtoMapper;
import com.fitme.admin.service.AdminFlaggedLinkService;
import com.fitme.admin.service.AdminPreviewMonitoringService;
import com.fitme.admin.service.AdminRuleService;
import com.fitme.analytics.dto.AdminDashboardResponse;
import com.fitme.analytics.service.AnalyticsService;
import com.fitme.brand.dto.BrandResponse;
import com.fitme.brand.service.BrandService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.privacy.service.PrivacyService;
import com.fitme.redirect.dto.FlaggedLinkResponse;
import com.fitme.redirect.service.RedirectService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AnalyticsService analyticsService;
    private final BrandService brandService;
    private final RedirectService redirectService;
    private final AdminFlaggedLinkService adminFlaggedLinkService;
    private final AdminRuleService adminRuleService;
    private final PrivacyService privacyService;
    private final AdminPreviewMonitoringService adminPreviewMonitoringService;
    private final AdminDtoMapper adminDtoMapper;
    private final AdminBrandListService adminBrandListService;

    @GetMapping("/dashboard")
    public ApiResponse<AdminDashboardResponse> dashboard() {
        return ApiResponse.ok(analyticsService.adminDashboard());
    }

    @GetMapping("/brands")
    public ApiResponse<List<AdminBrandListItemDto>> brands() {
        return ApiResponse.ok(adminBrandListService.listBrandsWithBilling());
    }

    @PostMapping("/brands/{id}/approve")
    public ApiResponse<BrandResponse> approveBrand(@PathVariable UUID id) {
        return ApiResponse.ok(brandService.approveBrand(id));
    }

    @PostMapping("/brands/{id}/reject")
    public ApiResponse<BrandResponse> rejectBrand(@PathVariable UUID id) {
        return ApiResponse.ok(brandService.rejectBrand(id));
    }

    @PostMapping("/brands/{id}/suspend")
    public ApiResponse<BrandResponse> suspendBrand(@PathVariable UUID id) {
        return ApiResponse.ok(brandService.suspendBrand(id));
    }

    @GetMapping("/flagged-links")
    public ApiResponse<List<FlaggedLinkResponse>> flaggedLinks() {
        return ApiResponse.ok(redirectService.listOpenFlaggedLinks());
    }

    @PostMapping("/flagged-links/{id}/resolve")
    public ApiResponse<FlaggedLinkResponse> resolveLink(@PathVariable UUID id) {
        return ApiResponse.ok(adminFlaggedLinkService.resolveLink(id));
    }

    @PostMapping("/flagged-links/{id}/reject")
    public ApiResponse<FlaggedLinkResponse> rejectLink(@PathVariable UUID id) {
        return ApiResponse.ok(adminFlaggedLinkService.rejectLink(id));
    }

    @GetMapping("/rules/styles")
    public ApiResponse<List<StyleRuleDto>> styleRules() {
        return ApiResponse.ok(adminRuleService.listStyleRules().stream().map(adminDtoMapper::toDto).toList());
    }

    @PostMapping("/rules/styles")
    public ApiResponse<StyleRuleDto> createStyleRule(@RequestBody StyleRuleRequest request) {
        return ApiResponse.ok(adminDtoMapper.toDto(adminRuleService.createStyleRule(request)));
    }

    @PutMapping("/rules/styles/{id}")
    public ApiResponse<StyleRuleDto> updateStyleRule(@PathVariable UUID id, @RequestBody StyleRuleRequest request) {
        return ApiResponse.ok(adminDtoMapper.toDto(adminRuleService.updateStyleRule(id, request)));
    }

    @DeleteMapping("/rules/styles/{id}")
    public ApiResponse<Void> deleteStyleRule(@PathVariable UUID id) {
        adminRuleService.deleteStyleRule(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/rules/occasions")
    public ApiResponse<List<OccasionRuleDto>> occasionRules() {
        return ApiResponse.ok(adminRuleService.listOccasionRules().stream().map(adminDtoMapper::toDto).toList());
    }

    @PostMapping("/rules/occasions")
    public ApiResponse<OccasionRuleDto> createOccasionRule(@RequestBody OccasionRuleRequest request) {
        return ApiResponse.ok(adminDtoMapper.toDto(adminRuleService.createOccasionRule(request)));
    }

    @PutMapping("/rules/occasions/{id}")
    public ApiResponse<OccasionRuleDto> updateOccasionRule(@PathVariable UUID id, @RequestBody OccasionRuleRequest request) {
        return ApiResponse.ok(adminDtoMapper.toDto(adminRuleService.updateOccasionRule(id, request)));
    }

    @DeleteMapping("/rules/occasions/{id}")
    public ApiResponse<Void> deleteOccasionRule(@PathVariable UUID id) {
        adminRuleService.deleteOccasionRule(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/privacy/consents")
    public ApiResponse<List<ConsentRecordDto>> consents() {
        return ApiResponse.ok(privacyService.listConsents().stream().map(adminDtoMapper::toDto).toList());
    }

    @GetMapping("/privacy/deletion-requests")
    public ApiResponse<List<DataDeletionRequestDto>> deletionRequests() {
        return ApiResponse.ok(privacyService.listDeletionRequests().stream().map(adminDtoMapper::toDto).toList());
    }

    @PostMapping("/privacy/deletion-requests/{id}/process")
    public ApiResponse<DataDeletionRequestDto> processDeletion(@PathVariable UUID id) {
        return ApiResponse.ok(adminDtoMapper.toDto(privacyService.processDeletion(id)));
    }

    @GetMapping("/try-on/monitoring")
    public ApiResponse<Map<String, Object>> tryOnMonitoring() {
        return ApiResponse.ok(analyticsService.tryOnMonitoring());
    }

    @GetMapping("/try-on/failed-previews")
    public ApiResponse<List<PreviewGenerationDto>> failedPreviews() {
        return ApiResponse.ok(adminPreviewMonitoringService.listFailedPreviews());
    }
}
