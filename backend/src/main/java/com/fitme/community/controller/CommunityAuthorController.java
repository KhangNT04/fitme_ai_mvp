package com.fitme.community.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.dto.PageResult;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.community.dto.CommunityAuthorDto;
import com.fitme.community.dto.CommunityPostDto;
import com.fitme.community.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Public community profile of an author.
 *
 * <p>The profile is addressed by the random {@code authorKey}, never by the account id, so the
 * URL can be shared without exposing anything personal.
 */
@RestController
@RequestMapping("/api/v1/community/authors")
@RequiredArgsConstructor
public class CommunityAuthorController {

    private final CommunityService communityService;

    @GetMapping("/{authorKey}")
    public ApiResponse<CommunityAuthorDto> profile(@PathVariable String authorKey,
                                                   @AuthenticationPrincipal FitMeUserPrincipal principal) {
        UUID viewerId = principal != null ? principal.getUserId() : null;
        return ApiResponse.ok(communityService.authorProfile(authorKey, viewerId));
    }

    @GetMapping("/{authorKey}/posts")
    public ApiResponse<PageResult<CommunityPostDto>> posts(@PathVariable String authorKey,
                                                           @AuthenticationPrincipal FitMeUserPrincipal principal,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "24") int size) {
        UUID viewerId = principal != null ? principal.getUserId() : null;
        return ApiResponse.ok(communityService.listByAuthorKey(authorKey, viewerId, page, size));
    }

    /** Follows an author. The target is given by their public author key. */
    @PostMapping("/{authorKey}/follow")
    public ApiResponse<Boolean> follow(@PathVariable String authorKey,
                                       @AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(communityService.followByAuthorKey(principal.getUserId(), authorKey));
    }

    @DeleteMapping("/{authorKey}/follow")
    public ApiResponse<Boolean> unfollow(@PathVariable String authorKey,
                                         @AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(communityService.unfollowByAuthorKey(principal.getUserId(), authorKey));
    }
}
