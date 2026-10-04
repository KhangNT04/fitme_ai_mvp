package com.fitme.rewards.repository;

import com.fitme.common.enums.ShareClaimStatus;
import com.fitme.rewards.entity.SocialShareClaim;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface SocialShareClaimRepository extends JpaRepository<SocialShareClaim, UUID> {

    boolean existsByPostUrl(String postUrl);

    long countByUserIdAndClaimDate(UUID userId, LocalDate claimDate);

    List<SocialShareClaim> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);

    List<SocialShareClaim> findTop100ByOrderByCreatedAtDesc();

    List<SocialShareClaim> findTop100ByStatusOrderByCreatedAtDesc(ShareClaimStatus status);
}
