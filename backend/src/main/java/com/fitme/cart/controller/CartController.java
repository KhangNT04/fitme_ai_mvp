package com.fitme.cart.controller;

import com.fitme.cart.dto.AddCartItemRequest;
import com.fitme.cart.dto.CartDto;
import com.fitme.cart.dto.UpdateCartItemRequest;
import com.fitme.cart.service.CartService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.RequestContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ApiResponse<CartDto> get() {
        return ApiResponse.ok(cartService.getCart(RequestContext.requireUserId()));
    }

    @PostMapping("/items")
    public ApiResponse<CartDto> add(@Valid @RequestBody AddCartItemRequest request) {
        return ApiResponse.ok(cartService.addItem(RequestContext.requireUserId(), request));
    }

    @PatchMapping("/items/{id}")
    public ApiResponse<CartDto> update(@PathVariable UUID id, @RequestBody UpdateCartItemRequest request) {
        return ApiResponse.ok(cartService.updateItem(RequestContext.requireUserId(), id, request.getQuantity()));
    }

    @DeleteMapping("/items/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        cartService.removeItem(RequestContext.requireUserId(), id);
        return ApiResponse.ok(null);
    }

    @DeleteMapping
    public ApiResponse<Void> clear() {
        cartService.clear(RequestContext.requireUserId());
        return ApiResponse.ok(null);
    }
}
