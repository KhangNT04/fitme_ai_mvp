package com.fitme.billing.repository;

import com.fitme.billing.entity.BrandSubscription;
import com.fitme.common.enums.BrandSubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BrandSubscriptionRepository extends JpaRepository<BrandSubscription, UUID> {

    Optional<BrandSubscription> findByBrandId(UUID brandId);

    List<BrandSubscription> findByStatusAndExpiresAtBefore(BrandSubscriptionStatus status, Instant expiresAt);
}
