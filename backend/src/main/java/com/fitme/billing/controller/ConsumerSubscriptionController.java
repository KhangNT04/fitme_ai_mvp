package com.fitme.billing.controller;

import com.fitme.billing.dto.CheckoutRequest;
import com.fitme.billing.dto.CheckoutResponse;
import com.fitme.billing.dto.ConsumerBillingOrderDto;
import com.fitme.billing.dto.SubscriptionReturnRequest;
import com.fitme.billing.service.ConsumerSubscriptionService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me/subscription")
@RequiredArgsConstructor
public class ConsumerSubscriptionController {

    private final ConsumerSubscriptionService subscriptionService;

    @PostMapping("/checkout")
    public ApiResponse<CheckoutResponse> checkout(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                  @Valid @RequestBody CheckoutRequest request) {
        return ApiResponse.ok(subscriptionService.checkout(principal.getUserId(), request.getPlanId()));
    }

    @PostMapping("/return")
    public ApiResponse<ConsumerBillingOrderDto> confirmReturn(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                              @Valid @RequestBody SubscriptionReturnRequest request) {
        return ApiResponse.ok(subscriptionService.confirmReturn(principal.getUserId(), request.getOrderCode()));
    }

    @GetMapping("/orders")
    public ApiResponse<List<ConsumerBillingOrderDto>> orders(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(subscriptionService.recentOrders(principal.getUserId()));
    }
}
