package com.fitme.community.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.community.dto.CommunityPostDto;
import com.fitme.community.dto.CommunityStatsDto;
import com.fitme.community.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Admin moderation: hide a post that breaks the rules and watch community engagement. */
@RestController
@RequestMapping("/api/v1/admin/community")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCommunityController {

    private final CommunityService communityService;

    @GetMapping("/stats")
    public ApiResponse<CommunityStatsDto> stats() {
        return ApiResponse.ok(communityService.stats());
    }

    @DeleteMapping("/posts/{postId}")
    public ApiResponse<Void> hidePost(@PathVariable UUID postId) {
        communityService.adminHide(postId);
        return ApiResponse.ok(null);
    }
}
