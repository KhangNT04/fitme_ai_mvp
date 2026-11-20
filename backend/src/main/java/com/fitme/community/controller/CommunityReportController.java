package com.fitme.community.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.community.dto.CommunityReportDto;
import com.fitme.community.dto.CreateCommunityReportRequest;
import com.fitme.community.service.CommunityReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/community/reports")
@RequiredArgsConstructor
public class CommunityReportController {

    private final CommunityReportService communityReportService;

    @PostMapping
    public ApiResponse<CommunityReportDto> create(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                  @Valid @RequestBody CreateCommunityReportRequest request) {
        return ApiResponse.ok(communityReportService.create(principal.getUserId(), request));
    }
}
