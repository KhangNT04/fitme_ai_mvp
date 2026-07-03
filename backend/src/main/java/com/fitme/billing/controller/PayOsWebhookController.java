package com.fitme.billing.controller;

import com.fitme.billing.service.BrandBillingService;
import com.fitme.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
public class PayOsWebhookController {

    private final BrandBillingService brandBillingService;

    @PostMapping("/payos")
    public ApiResponse<Void> payosWebhook(@RequestBody String rawBody) {
        brandBillingService.handleWebhook(rawBody);
        return ApiResponse.ok(null);
    }
}
