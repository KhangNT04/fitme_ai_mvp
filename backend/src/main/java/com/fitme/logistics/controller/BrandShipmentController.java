package com.fitme.logistics.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.logistics.dto.ShipmentDto;
import com.fitme.logistics.dto.ShipmentEventRequest;
import com.fitme.logistics.service.ShipmentService;
import com.fitme.order.service.SellerBrandResolver;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand/shipments")
@RequiredArgsConstructor
public class BrandShipmentController {

    private final ShipmentService shipmentService;
    private final SellerBrandResolver brandResolver;

    @PostMapping("/{id}/events")
    public ApiResponse<ShipmentDto> addEvent(@PathVariable UUID id, @Valid @RequestBody ShipmentEventRequest request) {
        return ApiResponse.ok(shipmentService.recordSellerEvent(brandResolver.currentBrandId(), id, request));
    }
}
