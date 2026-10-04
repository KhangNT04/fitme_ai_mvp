package com.fitme.rewards.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.rewards.dto.CheckinResultDto;
import com.fitme.rewards.dto.RewardsSummaryDto;
import com.fitme.rewards.dto.ShareClaimDto;
import com.fitme.rewards.dto.ShareClaimRequest;
import com.fitme.rewards.service.RewardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;

    @GetMapping
    public ApiResponse<RewardsSummaryDto> summary(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(rewardService.summary(principal.getUserId()));
    }

    @PostMapping("/checkin")
    public ApiResponse<CheckinResultDto> checkin(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(rewardService.checkin(principal.getUserId()));
    }

    @PostMapping("/share")
    public ApiResponse<ShareClaimDto> share(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                            @Valid @RequestBody ShareClaimRequest request) {
        return ApiResponse.ok(rewardService.submitShare(principal.getUserId(), request));
    }

    @GetMapping("/share")
    public ApiResponse<List<ShareClaimDto>> shares(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(rewardService.listShares(principal.getUserId()));
    }
}
