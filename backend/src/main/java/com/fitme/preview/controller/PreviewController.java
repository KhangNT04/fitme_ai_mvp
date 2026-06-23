package com.fitme.preview.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.preview.dto.CreatePreviewRequest;
import com.fitme.preview.dto.PreviewResponse;
import com.fitme.preview.service.PreviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/previews")
@RequiredArgsConstructor
public class PreviewController {

    private final PreviewService previewService;

    @PostMapping
    public ApiResponse<PreviewResponse> create(@RequestBody CreatePreviewRequest request) {
        return ApiResponse.ok(previewService.create(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<PreviewResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(previewService.get(id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        previewService.delete(id);
        return ApiResponse.ok(null);
    }
}
