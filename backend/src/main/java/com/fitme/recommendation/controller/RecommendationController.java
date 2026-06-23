package com.fitme.recommendation.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.feedback.dto.FeedbackRequest;
import com.fitme.feedback.service.FeedbackService;
import com.fitme.recommendation.dto.CreateRecommendationRequest;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.recommendation.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final FeedbackService feedbackService;

    @PostMapping
    public ApiResponse<RecommendationResponse> create(@Valid @RequestBody CreateRecommendationRequest request) {
        return ApiResponse.ok(recommendationService.generate(request));
    }

    @GetMapping("/saved")
    public ApiResponse<List<RecommendationResponse>> getSaved() {
        return ApiResponse.ok(recommendationService.getSaved());
    }

    @GetMapping("/{id}")
    public ApiResponse<RecommendationResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(recommendationService.getById(id));
    }

    @PostMapping("/{id}/save")
    public ApiResponse<Void> save(@PathVariable UUID id) {
        recommendationService.save(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/feedback")
    public ApiResponse<Void> feedback(@PathVariable UUID id, @Valid @RequestBody FeedbackRequest request) {
        feedbackService.submitForRecommendation(id, request);
        return ApiResponse.ok(null);
    }

    @GetMapping("/{id}/similar-products")
    public ApiResponse<List<RecommendationResponse.OutfitItemDto>> similar(@PathVariable UUID id) {
        return ApiResponse.ok(recommendationService.similarProducts(id));
    }
}
