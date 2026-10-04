package com.fitme.order.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.order.dto.OrderDetailDto;
import com.fitme.order.dto.OrderSummaryDto;
import com.fitme.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderService orderService;

    @GetMapping
    public ApiResponse<List<OrderSummaryDto>> list(@RequestParam(required = false) String status) {
        return ApiResponse.ok(orderService.adminList(status));
    }

    @GetMapping("/{id}")
    public ApiResponse<OrderDetailDto> detail(@PathVariable UUID id) {
        return ApiResponse.ok(orderService.adminDetail(id));
    }
}
