package com.fitme.redirect.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.redirect.dto.BuyClickRequest;
import com.fitme.redirect.dto.BuyClickResponse;
import com.fitme.redirect.service.RedirectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/redirects")
@RequiredArgsConstructor
public class RedirectController {

    private final RedirectService redirectService;

    @PostMapping("/buy-click")
    public ApiResponse<BuyClickResponse> buyClick(@Valid @RequestBody BuyClickRequest request) {
        return ApiResponse.ok(redirectService.processBuyClick(request));
    }

    @GetMapping("/{eventId}")
    public ApiResponse<BuyClickResponse> get(@PathVariable UUID eventId) {
        return ApiResponse.ok(redirectService.getEvent(eventId));
    }
}
