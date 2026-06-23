package com.fitme.preview.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.preview.dto.PhotoUploadResponse;
import com.fitme.preview.service.PhotoUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/uploads/user-photo")
@RequiredArgsConstructor
public class PhotoUploadController {

    private final PhotoUploadService photoUploadService;

    @PostMapping("/consent")
    public ApiResponse<PhotoUploadResponse> consent() {
        return ApiResponse.ok(photoUploadService.recordConsent());
    }

    @PostMapping
    public ApiResponse<PhotoUploadResponse> upload(@RequestParam("file") MultipartFile file,
                                                   @RequestParam(required = false) UUID consentId) throws IOException {
        return ApiResponse.ok(photoUploadService.upload(file, consentId));
    }

    @GetMapping("/{id}/quality")
    public ApiResponse<PhotoUploadResponse> quality(@PathVariable UUID id) {
        return ApiResponse.ok(photoUploadService.checkQuality(id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) throws IOException {
        photoUploadService.delete(id);
        return ApiResponse.ok(null);
    }
}
