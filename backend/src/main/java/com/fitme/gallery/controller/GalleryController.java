package com.fitme.gallery.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.dto.PageResult;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.gallery.dto.GalleryImageDto;
import com.fitme.gallery.service.GalleryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/gallery")
@RequiredArgsConstructor
public class GalleryController {

    private final GalleryService galleryService;

    @GetMapping
    public ApiResponse<PageResult<GalleryImageDto>> list(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                         @RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "24") int size) {
        return ApiResponse.ok(galleryService.list(principal.getUserId(), page, size));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal FitMeUserPrincipal principal, @PathVariable UUID id) {
        galleryService.softDelete(principal.getUserId(), id);
        return ApiResponse.ok(null);
    }
}
