package com.fitme.wardrobe.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.wardrobe.dto.WardrobeItemRequest;
import com.fitme.wardrobe.dto.WardrobeItemResponse;
import com.fitme.wardrobe.service.WardrobeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wardrobe")
@RequiredArgsConstructor
public class WardrobeController {

    private final WardrobeService wardrobeService;

    @GetMapping("/items")
    public ApiResponse<List<WardrobeItemResponse>> list() {
        return ApiResponse.ok(wardrobeService.list());
    }

    @PostMapping("/items")
    public ApiResponse<WardrobeItemResponse> create(@Valid @RequestBody WardrobeItemRequest request) {
        return ApiResponse.ok(wardrobeService.create(request));
    }

    @PutMapping("/items/{id}")
    public ApiResponse<WardrobeItemResponse> update(@PathVariable UUID id,
                                                    @Valid @RequestBody WardrobeItemRequest request) {
        return ApiResponse.ok(wardrobeService.update(id, request));
    }

    @DeleteMapping("/items/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) throws IOException {
        wardrobeService.delete(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/items/{id}/image")
    public ApiResponse<WardrobeItemResponse> uploadImage(@PathVariable UUID id,
                                                         @RequestParam("file") MultipartFile file) throws IOException {
        return ApiResponse.ok(wardrobeService.uploadImage(id, file));
    }
}
