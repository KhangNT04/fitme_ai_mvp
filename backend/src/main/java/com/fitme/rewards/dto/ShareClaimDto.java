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
    /** Only set on the submit response: reward before the free-Fitken cap was applied. */
    private Integer rewardIntended;
    /** Only set on the submit response: true when the free-Fitken cap reduced the reward. */
    private Boolean rewardCapped;
    /** Only set on the submit response: free-Fitken balance cap. */
    private Integer maxBalance;
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
