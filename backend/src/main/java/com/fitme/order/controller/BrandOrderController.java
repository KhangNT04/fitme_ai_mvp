package com.fitme.order.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.logistics.dto.ShipOrderRequest;
import com.fitme.logistics.dto.ShipmentDto;
import com.fitme.order.dto.CancelOrderRequest;
import com.fitme.order.dto.SellerOrderDetailDto;
import com.fitme.order.dto.SellerOrderSummaryDto;
import com.fitme.order.service.SellerBrandResolver;
import com.fitme.order.service.SellerOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand/orders")
@RequiredArgsConstructor
public class BrandOrderController {

    private final SellerOrderService sellerOrderService;
    private final SellerBrandResolver brandResolver;

    @GetMapping
    public ApiResponse<List<SellerOrderSummaryDto>> list(@RequestParam(required = false) String status) {
        return ApiResponse.ok(sellerOrderService.list(brandResolver.currentBrandId(), status));
    }

    @GetMapping("/{id}")
    public ApiResponse<SellerOrderDetailDto> detail(@PathVariable UUID id) {
        return ApiResponse.ok(sellerOrderService.detail(brandResolver.currentBrandId(), id));
    }

    @PostMapping("/{id}/confirm")
    public ApiResponse<SellerOrderDetailDto> confirm(@PathVariable UUID id) {
        return ApiResponse.ok(sellerOrderService.confirm(brandResolver.currentBrandId(), id));
    }

    @PostMapping("/{id}/pack")
    public ApiResponse<SellerOrderDetailDto> pack(@PathVariable UUID id) {
        return ApiResponse.ok(sellerOrderService.pack(brandResolver.currentBrandId(), id));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<SellerOrderDetailDto> cancel(@PathVariable UUID id,
                                                    @Valid @RequestBody(required = false) CancelOrderRequest request) {
        return ApiResponse.ok(sellerOrderService.cancel(brandResolver.currentBrandId(), id,
                request == null ? null : request.getReason()));
    }

    @PostMapping("/{id}/ship")
    public ApiResponse<ShipmentDto> ship(@PathVariable UUID id, @Valid @RequestBody ShipOrderRequest request) {
        return ApiResponse.ok(sellerOrderService.ship(brandResolver.currentBrandId(), id, request));
    }
}
