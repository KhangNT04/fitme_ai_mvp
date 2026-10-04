package com.fitme.entitlement.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.enums.ConsumerPlan;
import com.fitme.entitlement.dto.ConsumerEntitlementResponse;
import com.fitme.entitlement.dto.SetConsumerPlanRequest;
import com.fitme.entitlement.service.ConsumerEntitlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/entitlement")
@RequiredArgsConstructor
public class ConsumerEntitlementController {

    private final ConsumerEntitlementService consumerEntitlementService;

    @GetMapping
    public ApiResponse<ConsumerEntitlementResponse> current() {
        return ApiResponse.ok(consumerEntitlementService.resolveCurrent());
    }

    @PutMapping("/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ConsumerEntitlementResponse> adminSetPlan(
            @PathVariable UUID userId,
            @Valid @RequestBody SetConsumerPlanRequest request) {
        ConsumerPlan plan = request.getPlan() != null ? request.getPlan() : ConsumerPlan.FREE;
        return ApiResponse.ok(consumerEntitlementService.setPlan(userId, plan, request.getCoherenceMode()));
    }
}
