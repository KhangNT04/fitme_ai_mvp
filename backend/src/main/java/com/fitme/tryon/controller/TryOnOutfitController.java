package com.fitme.tryon.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.tryon.dto.OutfitSuggestionsRequest;
import com.fitme.tryon.dto.OutfitSuggestionsResponse;
import com.fitme.tryon.dto.TryOnResponse;
import com.fitme.tryon.service.TryOnOutfitCompletionService;
import com.fitme.tryon.service.TryOnService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
}
