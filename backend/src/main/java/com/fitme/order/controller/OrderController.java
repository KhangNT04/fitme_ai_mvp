package com.fitme.order.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.RequestContext;
import com.fitme.order.dto.*;
import com.fitme.order.service.CheckoutService;
import com.fitme.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final CheckoutService checkoutService;
    private final OrderService orderService;

    @PostMapping("/preview")
    public ApiResponse<OrderPreviewDto> preview(@RequestBody PreviewOrderRequest request) {
        return ApiResponse.ok(checkoutService.preview(RequestContext.requireUserId(), request));
    }

    @PostMapping
    public ApiResponse<PlaceOrderResponse> place(@Valid @RequestBody PlaceOrderRequest request) {
        return ApiResponse.ok(checkoutService.place(RequestContext.requireUserId(), request));
    }

    @GetMapping
    public ApiResponse<List<OrderSummaryDto>> list(@RequestParam(required = false) String status) {
        return ApiResponse.ok(orderService.list(RequestContext.requireUserId(), status));
    }

    @GetMapping("/{id}")
    public ApiResponse<OrderDetailDto> detail(@PathVariable UUID id) {
        return ApiResponse.ok(orderService.detail(RequestContext.requireUserId(), id));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<OrderDetailDto> cancel(@PathVariable UUID id,
                                              @Valid @RequestBody(required = false) CancelOrderRequest request) {
        return ApiResponse.ok(orderService.cancel(RequestContext.requireUserId(), id,
                request == null ? null : request.getReason()));
    }

    @PostMapping("/{id}/pay")
    public ApiResponse<PayOrderResponse> pay(@PathVariable UUID id) {
        return ApiResponse.ok(orderService.pay(RequestContext.requireUserId(), id));
    }

    @PostMapping("/payos/return")
    public ApiResponse<OrderDetailDto> payosReturn(@RequestBody PayosReturnRequest request) {
        return ApiResponse.ok(orderService.payosReturn(RequestContext.requireUserId(), request.getOrderCode()));
    }

    @GetMapping("/{id}/tracking")
    public ApiResponse<List<TrackingEntryDto>> tracking(@PathVariable UUID id) {
        return ApiResponse.ok(orderService.tracking(RequestContext.requireUserId(), id));
    }
}
