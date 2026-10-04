package com.fitme.review.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.enums.ReviewStatus;
import com.fitme.review.dto.HideReviewRequest;
import com.fitme.review.dto.ReviewItemDto;
import com.fitme.review.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/reviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public ApiResponse<List<ReviewItemDto>> list(@RequestParam(required = false) ReviewStatus status) {
        return ApiResponse.ok(reviewService.adminList(status));
    }

    @PostMapping("/{id}/hide")
    public ApiResponse<ReviewItemDto> hide(@PathVariable UUID id,
                                           @RequestBody(required = false) HideReviewRequest request) {
        return ApiResponse.ok(reviewService.adminHide(id, request));
    }
}
