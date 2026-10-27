package com.fitme.community.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.community.dto.CommunityCommentDto;
import com.fitme.community.dto.CreateCommunityCommentRequest;
import com.fitme.community.service.CommunityCommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Reading a post's comment thread is public; writing needs a signed-in user. */
@RestController
@RequestMapping("/api/v1/community/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommunityCommentController {

    private final CommunityCommentService commentService;

    @GetMapping
    public ApiResponse<List<CommunityCommentDto>> list(
            @PathVariable UUID postId,
            @AuthenticationPrincipal FitMeUserPrincipal principal) {
        UUID viewerId = principal != null ? principal.getUserId() : null;
        return ApiResponse.ok(commentService.listByPost(postId, viewerId));
    }

    @PostMapping
    public ApiResponse<CommunityCommentDto> create(
            @AuthenticationPrincipal FitMeUserPrincipal principal,
            @PathVariable UUID postId,
            @Valid @RequestBody CreateCommunityCommentRequest request) {
        return ApiResponse.ok(commentService.create(principal.getUserId(), postId, request));
    }

    @DeleteMapping("/{commentId}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal FitMeUserPrincipal principal,
            @PathVariable UUID postId,
            @PathVariable UUID commentId) {
        commentService.delete(principal.getUserId(), postId, commentId);
        return ApiResponse.ok(null);
    }
}
