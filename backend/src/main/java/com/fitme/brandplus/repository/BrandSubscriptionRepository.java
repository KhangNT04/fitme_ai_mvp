package com.fitme.brandplus.repository;

import com.fitme.brandplus.entity.BrandSubscription;
import com.fitme.common.enums.BrandSubscriptionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface BrandSubscriptionRepository extends JpaRepository<BrandSubscription, UUID> {

    Optional<BrandSubscription> findByBrandId(UUID brandId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from BrandSubscription s where s.brandId = :brandId")
    Optional<BrandSubscription> findByBrandIdForUpdate(@Param("brandId") UUID brandId);

    boolean existsByBrandIdAndStatusAndEndsAtAfter(UUID brandId, BrandSubscriptionStatus status, Instant now);

    @Query("select s.brandId from BrandSubscription s where s.status = :status and s.endsAt > :now")
    Set<UUID> findBrandIdsByStatusAndEndsAtAfter(@Param("status") BrandSubscriptionStatus status,
                                                 @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update BrandSubscription s set s.status = :expired, s.updatedAt = :now "
            + "where s.status = :active and s.endsAt < :now")
    int expireEndedBefore(@Param("now") Instant now,
                          @Param("active") BrandSubscriptionStatus active,
                          @Param("expired") BrandSubscriptionStatus expired);

    List<BrandSubscription> findAllByOrderByEndsAtDesc();

    boolean existsByPlanId(UUID planId);
}
