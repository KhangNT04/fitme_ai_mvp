package com.fitme.billing.repository;

import com.fitme.billing.entity.ConsumerSubscription;
import com.fitme.common.enums.ConsumerSubscriptionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConsumerSubscriptionRepository extends JpaRepository<ConsumerSubscription, UUID> {

    Optional<ConsumerSubscription> findByUserId(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ConsumerSubscription s where s.userId = :userId")
    Optional<ConsumerSubscription> findByUserIdForUpdate(@Param("userId") UUID userId);

    List<ConsumerSubscription> findByStatusAndExpiresAtBefore(ConsumerSubscriptionStatus status, Instant before);

    boolean existsByPlanId(UUID planId);
}
