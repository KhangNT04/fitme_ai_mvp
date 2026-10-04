package com.fitme.rewards.dto;

import com.fitme.common.enums.ShareClaimStatus;
import com.fitme.rewards.entity.SocialShareClaim;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ShareClaimDto {
    private UUID id;
    private UUID userId;
    private String postUrl;
    private String platform;
    private ShareClaimStatus status;
    private int rewardGranted;
    private UUID tryOnRequestId;
    private UUID galleryImageId;
    private String adminNote;
    private Instant reviewedAt;
    private Instant createdAt;

    public static ShareClaimDto from(SocialShareClaim claim) {
        return ShareClaimDto.builder()
                .id(claim.getId())
                .userId(claim.getUserId())
                .postUrl(claim.getPostUrl())
                .platform(claim.getPlatform())
                .status(claim.getStatus())
                .rewardGranted(claim.getRewardGranted())
                .tryOnRequestId(claim.getTryOnRequestId())
                .galleryImageId(claim.getGalleryImageId())
                .adminNote(claim.getAdminNote())
                .reviewedAt(claim.getReviewedAt())
                .createdAt(claim.getCreatedAt())
                .build();
    }
}
