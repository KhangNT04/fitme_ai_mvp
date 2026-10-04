package com.fitme.admin.controller;

import com.fitme.brand.dto.MediaUploadResponse;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.exception.BusinessException;
import com.fitme.tryon.dto.TryOnAvatarDto;
import com.fitme.tryon.service.TryOnAvatarService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/tryon-avatars")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminTryOnAvatarController {

    private final TryOnAvatarService tryOnAvatarService;

    @GetMapping
    public ApiResponse<List<TryOnAvatarDto>> list() {
        return ApiResponse.ok(tryOnAvatarService.listAll());
    }

    @PostMapping
    public ApiResponse<TryOnAvatarDto> create(@RequestBody TryOnAvatarDto.Upsert request) {
        return ApiResponse.ok(tryOnAvatarService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<TryOnAvatarDto> update(@PathVariable UUID id, @RequestBody TryOnAvatarDto.Upsert request) {
        return ApiResponse.ok(tryOnAvatarService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        tryOnAvatarService.delete(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/move")
    public ApiResponse<List<TryOnAvatarDto>> move(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String direction = body.get("direction");
        if (!"UP".equalsIgnoreCase(direction) && !"DOWN".equalsIgnoreCase(direction)) {
            throw new BusinessException("Hướng sắp xếp không hợp lệ (UP hoặc DOWN)");
        }
        return ApiResponse.ok(tryOnAvatarService.move(id, "UP".equalsIgnoreCase(direction)));
    }

    @PostMapping("/images")
    public ApiResponse<MediaUploadResponse> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        return ApiResponse.ok(tryOnAvatarService.uploadImage(file));
    }
}
