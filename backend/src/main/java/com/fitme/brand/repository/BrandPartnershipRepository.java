package com.fitme.brand.repository;

import com.fitme.brand.entity.BrandPartnership;
import com.fitme.common.enums.BrandPartnershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BrandPartnershipRepository extends JpaRepository<BrandPartnership, UUID> {

    Optional<BrandPartnership> findByBrandAIdAndBrandBId(UUID brandAId, UUID brandBId);

    List<BrandPartnership> findByStatus(BrandPartnershipStatus status);

    @Query("""
            SELECT p FROM BrandPartnership p
            WHERE p.status = :status
              AND (p.brandAId = :brandId OR p.brandBId = :brandId)
            """)
    List<BrandPartnership> findActiveForBrand(
            @Param("brandId") UUID brandId,
            @Param("status") BrandPartnershipStatus status);
}
