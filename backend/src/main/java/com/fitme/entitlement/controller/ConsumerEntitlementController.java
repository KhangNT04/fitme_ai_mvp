package com.fitme.entitlement.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.entitlement.dto.ConsumerEntitlementResponse;
import com.fitme.entitlement.service.ConsumerEntitlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Admins change a consumer's plan via {@code PATCH /api/v1/admin/users/{id}/consumer-plan} (2FA-gated, audited). */
@RestController
@RequestMapping("/api/v1/me/entitlement")
@RequiredArgsConstructor
public class ConsumerEntitlementController {

    private final ConsumerEntitlementService consumerEntitlementService;

    @GetMapping
    public ApiResponse<ConsumerEntitlementResponse> current() {
        return ApiResponse.ok(consumerEntitlementService.resolveCurrent());
    }
}
