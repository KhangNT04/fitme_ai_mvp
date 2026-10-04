package com.fitme.settlement.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.order.service.SellerBrandResolver;
import com.fitme.settlement.dto.*;
import com.fitme.settlement.service.CommerceReportService;
import com.fitme.settlement.service.PayoutAccountService;
import com.fitme.settlement.service.SettlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/brand")
@RequiredArgsConstructor
public class BrandSettlementController {

    private final SettlementService settlementService;
    private final PayoutAccountService payoutAccountService;
    private final CommerceReportService reportService;
    private final SellerBrandResolver brandResolver;

    @GetMapping("/settlements")
    public ApiResponse<List<SettlementDto>> settlements() {
        return ApiResponse.ok(settlementService.listForBrand(brandResolver.currentBrandId()));
    }

    @GetMapping("/settlements/summary")
    public ApiResponse<SettlementSummaryDto> settlementSummary() {
        return ApiResponse.ok(settlementService.summary(brandResolver.currentBrandId()));
    }

    @GetMapping("/payout-account")
    public ApiResponse<PayoutAccountDto> payoutAccount() {
        return ApiResponse.ok(payoutAccountService.get(brandResolver.currentBrandId()));
    }

    @PutMapping("/payout-account")
    public ApiResponse<PayoutAccountDto> updatePayoutAccount(@Valid @RequestBody PayoutAccountRequest request) {
        return ApiResponse.ok(payoutAccountService.update(brandResolver.currentBrandId(), request));
    }

    @GetMapping("/sales/summary")
    public ApiResponse<SalesSummaryDto> salesSummary() {
        return ApiResponse.ok(reportService.salesSummary(brandResolver.currentBrandId()));
    }
}
