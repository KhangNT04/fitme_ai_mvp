package com.fitme.gallery.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.gallery.dto.GalleryStatsDto;
import com.fitme.gallery.service.GalleryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/gallery")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminGalleryController {

    private final GalleryService galleryService;

    @GetMapping("/stats")
    public ApiResponse<GalleryStatsDto> stats() {
        return ApiResponse.ok(galleryService.stats());
    }
}
