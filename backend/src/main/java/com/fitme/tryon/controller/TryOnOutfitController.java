package com.fitme.tryon.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.tryon.dto.OutfitSuggestionsRequest;
import com.fitme.tryon.dto.OutfitSuggestionsResponse;
import com.fitme.tryon.dto.TryOnQuoteResponse;
import com.fitme.tryon.dto.TryOnResponse;
import com.fitme.tryon.service.TryOnOutfitCompletionService;
import com.fitme.tryon.service.TryOnService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/try-on")
@RequiredArgsConstructor
public class TryOnOutfitController {

    private final TryOnOutfitCompletionService outfitCompletionService;
    private final TryOnService tryOnService;

    @PostMapping("/outfit-suggestions")
    public ApiResponse<OutfitSuggestionsResponse> suggestions(@RequestBody OutfitSuggestionsRequest request) {
        return ApiResponse.ok(outfitCompletionService.analyzeProductIds(
                request.getProductIds() != null ? request.getProductIds() : List.of()));
    }

    @GetMapping("/saved")
    public ApiResponse<List<TryOnResponse>> getSaved() {
        return ApiResponse.ok(tryOnService.getSaved());
    }

    /** Cost of an AI try-on of these products for the caller: a free Brand Plus try or Fitken. */
    @GetMapping("/quote")
    public ApiResponse<TryOnQuoteResponse> quote(@RequestParam(required = false) List<UUID> productIds) {
        return ApiResponse.ok(tryOnService.quote(productIds != null ? productIds : List.of()));
    }
}
