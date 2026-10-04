package com.fitme.fitken.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.dto.PageResult;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.fitken.dto.FitkenLedgerItemDto;
import com.fitme.fitken.dto.FitkenWalletResponse;
import com.fitme.fitken.service.FitkenSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me/fitken")
@RequiredArgsConstructor
public class FitkenController {

    private final FitkenSummaryService summaryService;

    @GetMapping
    public ApiResponse<FitkenWalletResponse> wallet(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(summaryService.wallet(principal.getUserId()));
    }

    @GetMapping("/ledger")
    public ApiResponse<PageResult<FitkenLedgerItemDto>> ledger(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                               @RequestParam(defaultValue = "0") int page,
                                                               @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(summaryService.ledger(principal.getUserId(), page, size));
    }
}
