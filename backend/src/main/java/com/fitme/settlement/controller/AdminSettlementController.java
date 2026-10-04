package com.fitme.settlement.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.settlement.dto.CommerceSummaryDto;
import com.fitme.settlement.dto.GenerateSettlementRequest;
import com.fitme.settlement.dto.MarkSettlementPaidRequest;
import com.fitme.settlement.dto.SettlementDto;
import com.fitme.settlement.service.CommerceReportService;
import com.fitme.settlement.service.SettlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminSettlementController {

    private final SettlementService settlementService;
    private final CommerceReportService reportService;

    @GetMapping("/commerce/summary")
    public ApiResponse<CommerceSummaryDto> summary() {
        return ApiResponse.ok(reportService.commerceSummary());
    }

    @GetMapping("/settlements")
    public ApiResponse<List<SettlementDto>> list(@RequestParam(required = false) String status,
                                                 @RequestParam(required = false) UUID brandId) {
        return ApiResponse.ok(settlementService.adminList(status, brandId));
    }

    @PostMapping("/settlements/generate")
    public ApiResponse<List<SettlementDto>> generate(@RequestBody(required = false) GenerateSettlementRequest request) {
        return ApiResponse.ok(settlementService.generate(request == null ? null : request.getBrandId()));
    }

    @PostMapping("/settlements/{id}/mark-paid")
    public ApiResponse<SettlementDto> markPaid(@PathVariable UUID id,
                                               @Valid @RequestBody(required = false) MarkSettlementPaidRequest request) {
        return ApiResponse.ok(settlementService.markPaid(id, request == null ? null : request.getPayoutRef()));
    }
}
