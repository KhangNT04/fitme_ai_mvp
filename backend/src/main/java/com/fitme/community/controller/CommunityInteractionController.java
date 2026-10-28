package com.fitme.community.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.community.dto.CommunityPostDto;
import com.fitme.community.dto.CommunityPostInteractionDto;
import com.fitme.community.dto.CommunityProfileDto;
import com.fitme.community.dto.CreateCommunityPostRequest;
import com.fitme.community.dto.CreateCommunityPostResult;
import com.fitme.community.dto.UpdateCommunityPostRequest;
import com.fitme.community.service.CommunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Publishing a post and the like/save/follow interactions. Every endpoint needs a signed-in user. */
@RestController
@RequestMapping("/api/v1/community")
@RequiredArgsConstructor
public class CommunityInteractionController {

    private final CommunityService communityService;

    @PostMapping("/posts")
    public ApiResponse<CreateCommunityPostResult> create(
            @AuthenticationPrincipal FitMeUserPrincipal principal,
            @Valid @RequestBody CreateCommunityPostRequest request) {
        return ApiResponse.ok(communityService.create(principal.getUserId(), request));
    }

    @DeleteMapping("/posts/{postId}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                    @PathVariable UUID postId) {
        communityService.delete(principal.getUserId(), postId);
        return ApiResponse.ok(null);
    }

    /** Edits the title and caption of a post the signed-in user published. */
    @PatchMapping("/posts/{postId}")
    public ApiResponse<CommunityPostDto> update(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                 @PathVariable UUID postId,
                                                 @Valid @RequestBody UpdateCommunityPostRequest request) {
        return ApiResponse.ok(communityService.update(principal.getUserId(), postId, request));
    }

    @PostMapping("/posts/{postId}/like")
    public ApiResponse<CommunityPostInteractionDto> like(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                        @PathVariable UUID postId) {
        return ApiResponse.ok(communityService.toggleLike(principal.getUserId(), postId, true));
    }

    @DeleteMapping("/posts/{postId}/like")
    public ApiResponse<CommunityPostInteractionDto> unlike(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                          @PathVariable UUID postId) {
        return ApiResponse.ok(communityService.toggleLike(principal.getUserId(), postId, false));
    }

    @PostMapping("/posts/{postId}/save")
    public ApiResponse<CommunityPostInteractionDto> save(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                         @PathVariable UUID postId) {
        return ApiResponse.ok(communityService.toggleSave(principal.getUserId(), postId, true));
    }

    @DeleteMapping("/posts/{postId}/save")
    public ApiResponse<CommunityPostInteractionDto> unsave(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                           @PathVariable UUID postId) {
        return ApiResponse.ok(communityService.toggleSave(principal.getUserId(), postId, false));
    }

    @PostMapping("/users/{followedId}/follow")
    public ApiResponse<Boolean> follow(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                       @PathVariable UUID followedId) {
        return ApiResponse.ok(communityService.follow(principal.getUserId(), followedId));
    }

    @DeleteMapping("/users/{followedId}/follow")
    public ApiResponse<Boolean> unfollow(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                         @PathVariable UUID followedId) {
        return ApiResponse.ok(communityService.unfollow(principal.getUserId(), followedId));
    }

    @GetMapping("/me")
    public ApiResponse<CommunityProfileDto> myProfile(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(communityService.profile(principal.getUserId()));
    }
}
