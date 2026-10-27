package com.fitme.community.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.dto.PageResult;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.community.dto.CommunityPostDto;
import com.fitme.community.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Community posts the signed-in user saved, shown in the "Đã lưu" tab. */
@RestController
@RequestMapping("/api/v1/me/community")
@RequiredArgsConstructor
public class CommunitySavedController {

    private final CommunityService communityService;

    @GetMapping("/saves")
    public ApiResponse<PageResult<CommunityPostDto>> saves(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "24") int size) {
        return ApiResponse.ok(communityService.listSaved(principal.getUserId(), page, size));
    }

    /**
     * Posts the signed-in user published, newest first. Includes hidden and removed posts so
     * the author can still see (and manage) what they once shared.
     */
    @GetMapping("/posts")
    public ApiResponse<PageResult<CommunityPostDto>> myPosts(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "24") int size) {
        return ApiResponse.ok(communityService.listByOwner(principal.getUserId(), page, size));
    }
}
