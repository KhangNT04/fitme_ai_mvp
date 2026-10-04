package com.fitme.rewards.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.enums.ShareClaimStatus;
import com.fitme.rewards.dto.AdminNoteRequest;
import com.fitme.rewards.dto.ShareClaimDto;
import com.fitme.rewards.service.RewardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/rewards")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRewardController {

    private final RewardService rewardService;

    @GetMapping("/shares")
    public ApiResponse<List<ShareClaimDto>> shares(@RequestParam(required = false) ShareClaimStatus status) {
        return ApiResponse.ok(rewardService.adminListShares(status));
    }

    @PostMapping("/shares/{id}/reject")
    public ApiResponse<ShareClaimDto> reject(@PathVariable UUID id,
                                             @RequestBody(required = false) AdminNoteRequest request) {
        return ApiResponse.ok(rewardService.adminReject(id, request != null ? request.getNote() : null));
    }
}
