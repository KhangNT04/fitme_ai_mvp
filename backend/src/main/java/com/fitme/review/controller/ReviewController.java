package com.fitme.review.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.review.dto.CreateReviewRequest;
import com.fitme.review.dto.CreateReviewResponse;
import com.fitme.review.dto.ProductReviewsResponse;
import com.fitme.review.dto.ReviewImageUploadResponse;
import com.fitme.review.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/products/{productId}/reviews")
    public ApiResponse<ProductReviewsResponse> list(@PathVariable UUID productId,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(reviewService.listForProduct(productId, page, size));
    }

    @PostMapping("/products/{productId}/reviews")
    public ApiResponse<CreateReviewResponse> create(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                    @PathVariable UUID productId,
                                                    @Valid @RequestBody CreateReviewRequest request) {
        return ApiResponse.ok(reviewService.create(principal.getUserId(), productId, request));
    }

    @PostMapping(value = "/reviews/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ReviewImageUploadResponse> uploadImage(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                              @RequestParam("file") MultipartFile file)
            throws IOException {
        return ApiResponse.ok(reviewService.uploadImage(principal.getUserId(), file));
    }
}
