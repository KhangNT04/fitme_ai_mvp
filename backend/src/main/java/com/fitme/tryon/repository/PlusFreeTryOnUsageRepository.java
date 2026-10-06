package com.fitme.tryon.repository;

import com.fitme.common.enums.PlusFreeTryOnStatus;
import com.fitme.tryon.entity.PlusFreeTryOnUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface PlusFreeTryOnUsageRepository extends JpaRepository<PlusFreeTryOnUsage, UUID> {

    long countByUserIdAndUsageDateAndStatus(UUID userId, LocalDate usageDate, PlusFreeTryOnStatus status);

    Optional<PlusFreeTryOnUsage> findByTryOnRef(UUID tryOnRef);

    @Modifying(flushAutomatically = true)
    @Query("update PlusFreeTryOnUsage u set u.status = :refunded, u.refundedAt = :now "
            + "where u.tryOnRef = :ref and u.status = :used")
    int markRefunded(@Param("ref") UUID ref,
                     @Param("used") PlusFreeTryOnStatus used,
                     @Param("refunded") PlusFreeTryOnStatus refunded,
                     @Param("now") Instant now);
}
