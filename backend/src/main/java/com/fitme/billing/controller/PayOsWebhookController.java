package com.fitme.billing.controller;

import com.fitme.billing.payos.PayOsClient;
import com.fitme.billing.payos.PayOsWebhookHandler;
import com.fitme.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
@Slf4j
public class PayOsWebhookController {

    private final PayOsClient payOsClient;
    private final List<PayOsWebhookHandler> handlers;

    @PostMapping("/payos")
    @ResponseStatus(HttpStatus.OK)
    public ApiResponse<Void> payosWebhook(@RequestBody String rawBody) {
        long orderCode = payOsClient.verifyAndParseWebhook(rawBody);
        boolean handled = handlers.stream().anyMatch(handler -> handler.handlePaid(orderCode));
        if (!handled) {
            log.warn("PayOS webhook acknowledged for unknown orderCode={}", orderCode);
        }
        return ApiResponse.ok(null);
    }
}
