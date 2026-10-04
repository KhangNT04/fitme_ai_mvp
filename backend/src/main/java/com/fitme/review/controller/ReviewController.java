package com.fitme.review.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.review.dto.CreateReviewRequest;
import com.fitme.review.dto.CreateReviewResponse;
import com.fitme.review.dto.FeaturedReviewDto;
import com.fitme.review.dto.HelpfulVoteResponse;
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
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/products/{productId}/reviews")
    public ApiResponse<ProductReviewsResponse> list(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                    @PathVariable UUID productId,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "10") int size) {
        UUID viewerId = principal != null ? principal.getUserId() : null;
        return ApiResponse.ok(reviewService.listForProduct(productId, page, size, viewerId));
    }

    @GetMapping("/products/featured-reviews")
    public ApiResponse<List<FeaturedReviewDto>> featured(@RequestParam(defaultValue = "6") int limit) {
        return ApiResponse.ok(reviewService.featured(limit));
    }

    @PostMapping("/reviews/{reviewId}/helpful")
    public ApiResponse<HelpfulVoteResponse> markHelpful(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                        @PathVariable UUID reviewId) {
        return ApiResponse.ok(reviewService.voteHelpful(principal.getUserId(), reviewId, true));
    }

    @DeleteMapping("/reviews/{reviewId}/helpful")
    public ApiResponse<HelpfulVoteResponse> unmarkHelpful(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                          @PathVariable UUID reviewId) {
        return ApiResponse.ok(reviewService.voteHelpful(principal.getUserId(), reviewId, false));
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
