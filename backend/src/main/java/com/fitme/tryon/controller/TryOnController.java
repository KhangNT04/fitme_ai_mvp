package com.fitme.tryon.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.feedback.dto.FeedbackRequest;
import com.fitme.feedback.service.FeedbackService;
import com.fitme.tryon.dto.*;
import com.fitme.tryon.service.TryOnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/try-on/requests")
@RequiredArgsConstructor
public class TryOnController {

    private final TryOnService tryOnService;
    private final FeedbackService feedbackService;

    @PostMapping
    public ApiResponse<TryOnResponse> create(@RequestBody CreateTryOnRequest request) {
        return ApiResponse.ok(tryOnService.create(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<TryOnResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(tryOnService.get(id));
    }

    @PostMapping("/{id}/items")
    public ApiResponse<TryOnResponse> addItem(@PathVariable UUID id,
                                              @Valid @RequestBody AddTryOnItemRequest request) {
        return ApiResponse.ok(tryOnService.addItem(id, request));
    }

    @PostMapping("/{id}/generate")
    public ApiResponse<TryOnResponse> generate(@PathVariable UUID id) {
        return ApiResponse.ok(tryOnService.generate(id));
    }

    @GetMapping("/{id}/result")
    public ApiResponse<TryOnResponse> result(@PathVariable UUID id) {
        return ApiResponse.ok(tryOnService.getResult(id));
    }

    @PostMapping("/{id}/variants/color")
    public ApiResponse<TryOnResponse> variantColor(@PathVariable UUID id, @RequestBody VariantRequest request) {
        return ApiResponse.ok(tryOnService.variantColor(id, request));
    }

    @PostMapping("/{id}/variants/size")
    public ApiResponse<TryOnResponse> variantSize(@PathVariable UUID id, @RequestBody VariantRequest request) {
        return ApiResponse.ok(tryOnService.variantSize(id, request));
    }

    @PostMapping("/{id}/variants/form")
    public ApiResponse<TryOnResponse> variantForm(@PathVariable UUID id, @RequestBody VariantRequest request) {
        return ApiResponse.ok(tryOnService.variantForm(id, request));
    }

    @PostMapping("/{id}/save")
    public ApiResponse<Void> save(@PathVariable UUID id) {
        tryOnService.save(id);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/{id}/save")
    public ApiResponse<Void> unsave(@PathVariable UUID id) {
        tryOnService.unsave(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/feedback")
    public ApiResponse<Void> feedback(@PathVariable UUID id, @Valid @RequestBody FeedbackRequest request) {
        feedbackService.submitForTryOn(id, request);
        return ApiResponse.ok(null);
    }
}
