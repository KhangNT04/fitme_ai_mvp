package com.fitme.community.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.community.dto.CommunityCommentNotificationDto;
import com.fitme.community.service.CommunityCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The signed-in user's comment notifications: somebody replied to their post or comment. */
@RestController
@RequestMapping("/api/v1/me/community/notifications")
@RequiredArgsConstructor
public class CommunityNotificationController {

    private final CommunityCommentService commentService;

    @GetMapping
    public ApiResponse<List<CommunityCommentNotificationDto>> list(
            @AuthenticationPrincipal FitMeUserPrincipal principal,
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.ok(commentService.listNotifications(principal.getUserId(), limit));
    }
}
