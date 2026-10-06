package com.fitme.brandvoucher.controller;

import com.fitme.brandvoucher.dto.AdminBrandVoucherDto;
import com.fitme.brandvoucher.dto.IssueVouchersRequest;
import com.fitme.brandvoucher.dto.IssueVouchersResponse;
import com.fitme.brandvoucher.dto.VoucherCampaignDto;
import com.fitme.brandvoucher.dto.VoucherCampaignRequest;
import com.fitme.brandvoucher.service.VoucherCampaignService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminVoucherCampaignController {

    private final VoucherCampaignService campaignService;

    @GetMapping("/voucher-campaigns")
    public ApiResponse<List<VoucherCampaignDto>> list() {
        return ApiResponse.ok(campaignService.list());
    }

    @GetMapping("/voucher-campaigns/{id}")
    public ApiResponse<VoucherCampaignDto> get(@PathVariable UUID id) {
        return ApiResponse.ok(campaignService.get(id));
    }

    @PostMapping("/voucher-campaigns")
    public ApiResponse<VoucherCampaignDto> create(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                  @Valid @RequestBody VoucherCampaignRequest request) {
        return ApiResponse.ok(campaignService.create(request, principal.getUserId()));
    }

    @PutMapping("/voucher-campaigns/{id}")
    public ApiResponse<VoucherCampaignDto> update(@PathVariable UUID id,
                                                  @Valid @RequestBody VoucherCampaignRequest request) {
        return ApiResponse.ok(campaignService.update(id, request));
    }

    @PostMapping("/voucher-campaigns/{id}/issue")
    public ApiResponse<IssueVouchersResponse> issue(@PathVariable UUID id,
                                                    @Valid @RequestBody IssueVouchersRequest request) {
        return ApiResponse.ok(campaignService.issue(id, request));
    }

    @GetMapping("/voucher-campaigns/{id}/vouchers")
    public ApiResponse<List<AdminBrandVoucherDto>> vouchers(@PathVariable UUID id) {
        return ApiResponse.ok(campaignService.listVouchers(id));
    }

    @PostMapping("/brand-vouchers/{id}/revoke")
    public ApiResponse<AdminBrandVoucherDto> revoke(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                    @PathVariable UUID id) {
        return ApiResponse.ok(campaignService.revoke(id, principal.getUserId()));
    }
}
