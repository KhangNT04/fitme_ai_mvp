package com.fitme.tryon.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.tryon.dto.TryOnAvatarDto;
import com.fitme.tryon.service.TryOnAvatarService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TryOnAvatarController {

    private final TryOnAvatarService tryOnAvatarService;

    @GetMapping("/api/v1/try-on/avatars")
    public ApiResponse<List<TryOnAvatarDto>> list() {
        return ApiResponse.ok(tryOnAvatarService.listActive());
    }
}
