package com.fitme.logistics.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.logistics.config.LogisticsProperties;
import com.fitme.logistics.dto.LogisticsEventRequest;
import com.fitme.logistics.dto.ShipmentDto;
import com.fitme.logistics.service.ShipmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Simulated carrier callback; authenticated by a shared token instead of a user session. */
@RestController
@RequestMapping("/api/v1/webhooks/logistics")
@RequiredArgsConstructor
public class LogisticsWebhookController {

    private final ShipmentService shipmentService;
    private final LogisticsProperties properties;

    @PostMapping
    public ApiResponse<ShipmentDto> event(@RequestHeader("X-Logistics-Token") String token,
                                          @Valid @RequestBody LogisticsEventRequest request) {
        if (!MessageDigest.isEqual(properties.getWebhookToken().getBytes(StandardCharsets.UTF_8),
                token.getBytes(StandardCharsets.UTF_8))) {
            throw new AccessDeniedException("Token logistics không hợp lệ");
        }
        return ApiResponse.ok(shipmentService.recordCarrierEvent(request.getTrackingCode(), request.toEvent()));
    }
}
