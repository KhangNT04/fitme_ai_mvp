package com.fitme.community.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.dto.PageResult;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.community.dto.CommunityPostDto;
import com.fitme.community.dto.CommunityReportDto;
import com.fitme.community.dto.CommunityStatsDto;
import com.fitme.community.service.CommunityReportService;
import com.fitme.community.service.CommunityService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Admin moderation: posts queue, hide/unhide, and community reports. */
@RestController
@RequestMapping("/api/v1/admin/community")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCommunityController {

    private final CommunityService communityService;
    private final CommunityReportService communityReportService;

    @GetMapping("/stats")
    public ApiResponse<CommunityStatsDto> stats() {
        return ApiResponse.ok(communityService.stats());
    }

    @GetMapping("/posts")
    public ApiResponse<PageResult<CommunityPostDto>> posts(
            @RequestParam(required = false) String visibility,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(communityService.adminList(visibility, page, size));
    }

    @DeleteMapping("/posts/{postId}")
    public ApiResponse<Void> hidePost(@PathVariable UUID postId) {
        communityService.adminHide(postId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/posts/{postId}/unhide")
    public ApiResponse<Void> unhidePost(@PathVariable UUID postId) {
        communityService.adminUnhide(postId);
        return ApiResponse.ok(null);
    }

    @GetMapping("/reports")
    public ApiResponse<PageResult<CommunityReportDto>> reports(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(communityReportService.adminList(status, page, size));
    }

    @PostMapping("/reports/{reportId}/resolve")
    public ApiResponse<CommunityReportDto> resolveReport(
            @AuthenticationPrincipal FitMeUserPrincipal principal,
            @PathVariable UUID reportId,
            @RequestBody ResolveReportRequest body) {
        return ApiResponse.ok(communityReportService.resolve(
                principal.getUserId(),
                reportId,
                body.getStatus(),
                body.getNote(),
                body.isHidePost()));
    }

    @Data
    public static class ResolveReportRequest {
        private String status = "RESOLVED";
        private String note;
        private boolean hidePost;
    }
}
