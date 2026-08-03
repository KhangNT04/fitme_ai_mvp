package com.fitme.redirect.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.redirect.dto.BuyClickRequest;
import com.fitme.redirect.dto.BuyClickResponse;
import com.fitme.redirect.dto.PurchaseHistoryItemResponse;
import com.fitme.redirect.dto.PurchaseHistoryResponse;
import com.fitme.redirect.service.PurchaseHistoryService;
import com.fitme.redirect.service.RedirectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/redirects")
@RequiredArgsConstructor
public class RedirectController {

    private final RedirectService redirectService;
    private final PurchaseHistoryService purchaseHistoryService;

    @PostMapping("/buy-click")
    public ApiResponse<BuyClickResponse> buyClick(@Valid @RequestBody BuyClickRequest request) {
        return ApiResponse.ok(redirectService.processBuyClick(request));
    }

    @GetMapping("/history")
    public ApiResponse<PurchaseHistoryResponse> history() {
        return ApiResponse.ok(purchaseHistoryService.listForCurrentUser());
    }

    @PostMapping("/{eventId}/purchased")
    public ApiResponse<PurchaseHistoryItemResponse> confirmPurchased(
            @PathVariable UUID eventId,
            @RequestBody(required = false) Map<String, Object> body) {
        boolean purchased = body == null || body.get("purchased") == null
                || Boolean.TRUE.equals(body.get("purchased"));
        return ApiResponse.ok(purchaseHistoryService.confirmPurchase(eventId, purchased));
    }

    @GetMapping("/{eventId}")
    public ApiResponse<BuyClickResponse> get(@PathVariable UUID eventId) {
        return ApiResponse.ok(redirectService.getEvent(eventId));
    }
}
