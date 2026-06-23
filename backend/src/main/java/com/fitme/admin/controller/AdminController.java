package com.fitme.admin.controller;

import com.fitme.admin.dto.OccasionRuleRequest;
import com.fitme.admin.dto.StyleRuleRequest;
import com.fitme.admin.entity.OccasionRule;
import com.fitme.admin.entity.StyleRule;
import com.fitme.admin.service.AdminRuleService;
import com.fitme.analytics.service.AnalyticsService;
import com.fitme.brand.dto.BrandResponse;
import com.fitme.brand.service.BrandService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.enums.FlaggedLinkStatus;
import com.fitme.common.exception.NotFoundException;
import com.fitme.preview.entity.PreviewGeneration;
import com.fitme.preview.repository.PreviewGenerationRepository;
import com.fitme.privacy.entity.ConsentRecord;
import com.fitme.privacy.entity.DataDeletionRequest;
import com.fitme.privacy.service.PrivacyService;
import com.fitme.redirect.entity.FlaggedLink;
import com.fitme.redirect.repository.FlaggedLinkRepository;
import com.fitme.common.enums.PreviewStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
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
    private final FlaggedLinkRepository flaggedLinkRepository;
    private final AdminRuleService adminRuleService;
    private final PrivacyService privacyService;
    private final PreviewGenerationRepository previewRepository;

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Object>> dashboard() {
        return ApiResponse.ok(analyticsService.adminDashboard());
    }

    @GetMapping("/brands")
    public ApiResponse<List<BrandResponse>> brands() {
        return ApiResponse.ok(brandService.listAllBrands());
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
    public ApiResponse<List<FlaggedLink>> flaggedLinks() {
        return ApiResponse.ok(flaggedLinkRepository.findByStatus(FlaggedLinkStatus.OPEN));
    }

    @PostMapping("/flagged-links/{id}/resolve")
    public ApiResponse<FlaggedLink> resolveLink(@PathVariable UUID id) {
        FlaggedLink link = flaggedLinkRepository.findById(id).orElseThrow(() -> new NotFoundException("Link không tồn tại"));
        link.setStatus(FlaggedLinkStatus.RESOLVED);
        link.setResolvedAt(Instant.now());
        return ApiResponse.ok(flaggedLinkRepository.save(link));
    }

    @PostMapping("/flagged-links/{id}/reject")
    public ApiResponse<FlaggedLink> rejectLink(@PathVariable UUID id) {
        FlaggedLink link = flaggedLinkRepository.findById(id).orElseThrow(() -> new NotFoundException("Link không tồn tại"));
        link.setStatus(FlaggedLinkStatus.REJECTED);
        link.setResolvedAt(Instant.now());
        return ApiResponse.ok(flaggedLinkRepository.save(link));
    }

    @GetMapping("/rules/styles")
    public ApiResponse<List<StyleRule>> styleRules() {
        return ApiResponse.ok(adminRuleService.listStyleRules());
    }

    @PostMapping("/rules/styles")
    public ApiResponse<StyleRule> createStyleRule(@RequestBody StyleRuleRequest request) {
        return ApiResponse.ok(adminRuleService.createStyleRule(request));
    }

    @PutMapping("/rules/styles/{id}")
    public ApiResponse<StyleRule> updateStyleRule(@PathVariable UUID id, @RequestBody StyleRuleRequest request) {
        return ApiResponse.ok(adminRuleService.updateStyleRule(id, request));
    }

    @DeleteMapping("/rules/styles/{id}")
    public ApiResponse<Void> deleteStyleRule(@PathVariable UUID id) {
        adminRuleService.deleteStyleRule(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/rules/occasions")
    public ApiResponse<List<OccasionRule>> occasionRules() {
        return ApiResponse.ok(adminRuleService.listOccasionRules());
    }

    @PostMapping("/rules/occasions")
    public ApiResponse<OccasionRule> createOccasionRule(@RequestBody OccasionRuleRequest request) {
        return ApiResponse.ok(adminRuleService.createOccasionRule(request));
    }

    @PutMapping("/rules/occasions/{id}")
    public ApiResponse<OccasionRule> updateOccasionRule(@PathVariable UUID id, @RequestBody OccasionRuleRequest request) {
        return ApiResponse.ok(adminRuleService.updateOccasionRule(id, request));
    }

    @DeleteMapping("/rules/occasions/{id}")
    public ApiResponse<Void> deleteOccasionRule(@PathVariable UUID id) {
        adminRuleService.deleteOccasionRule(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/privacy/consents")
    public ApiResponse<List<ConsentRecord>> consents() {
        return ApiResponse.ok(privacyService.listConsents());
    }

    @GetMapping("/privacy/deletion-requests")
    public ApiResponse<List<DataDeletionRequest>> deletionRequests() {
        return ApiResponse.ok(privacyService.listDeletionRequests());
    }

    @PostMapping("/privacy/deletion-requests/{id}/process")
    public ApiResponse<DataDeletionRequest> processDeletion(@PathVariable UUID id) {
        return ApiResponse.ok(privacyService.processDeletion(id));
    }

    @GetMapping("/try-on/monitoring")
    public ApiResponse<Map<String, Object>> tryOnMonitoring() {
        return ApiResponse.ok(analyticsService.tryOnMonitoring());
    }

    @GetMapping("/try-on/failed-previews")
    public ApiResponse<List<PreviewGeneration>> failedPreviews() {
        return ApiResponse.ok(previewRepository.findByStatus(PreviewStatus.FAILED));
    }
}
