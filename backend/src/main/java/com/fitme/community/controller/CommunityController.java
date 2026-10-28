package com.fitme.community.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.dto.PageResult;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.community.dto.CommunityFilterOptionsDto;
import com.fitme.community.dto.CommunityPostDto;
import com.fitme.community.dto.CreateCommunityPostRequest;
import com.fitme.community.dto.CreateCommunityPostResult;
import com.fitme.community.service.CommunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Public community feed and permalink lookup. Publishing and interactions live in their own controller. */
@RestController
@RequestMapping("/api/v1/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;

    @GetMapping("/posts")
    public ApiResponse<PageResult<CommunityPostDto>> feed(
            @AuthenticationPrincipal FitMeUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(required = false) String brandId,
            @RequestParam(required = false) String styleLabel,
            @RequestParam(required = false) String occasion,
            @RequestParam(defaultValue = "latest") String sort) {
        UUID viewerId = principal != null ? principal.getUserId() : null;
        return ApiResponse.ok(communityService.feed(viewerId, page, size, brandId, styleLabel, occasion, sort));
    }

    @GetMapping("/posts/{shareCode}")
    public ApiResponse<CommunityPostDto> byShareCode(@PathVariable String shareCode,
                                                     @AuthenticationPrincipal FitMeUserPrincipal principal) {
        UUID viewerId = principal != null ? principal.getUserId() : null;
        return ApiResponse.ok(communityService.byShareCode(shareCode, viewerId));
    }

    /** The style / occasion / brand filters available for the feed, with a count for each. */
    @GetMapping("/filters")
    public ApiResponse<CommunityFilterOptionsDto> filters() {
        return ApiResponse.ok(communityService.filterOptions());
    }
}
