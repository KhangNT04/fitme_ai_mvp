package com.fitme.settlement.repository;

import com.fitme.common.enums.SettlementStatus;
import com.fitme.settlement.entity.SellerSettlement;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SellerSettlementRepository extends JpaRepository<SellerSettlement, UUID> {

    List<SellerSettlement> findAllByOrderByCreatedAtDesc();

    List<SellerSettlement> findByStatusOrderByCreatedAtDesc(SettlementStatus status);

    List<SellerSettlement> findByBrandIdOrderByCreatedAtDesc(UUID brandId);

    List<SellerSettlement> findByBrandIdAndStatusOrderByCreatedAtDesc(UUID brandId, SettlementStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SellerSettlement s where s.id = :id")
    Optional<SellerSettlement> findByIdForUpdate(@Param("id") UUID id);

    @Query("select coalesce(sum(s.payoutVnd), 0) from SellerSettlement s where s.brandId = :brandId and s.status = :status")
    long sumPayoutByBrandAndStatus(@Param("brandId") UUID brandId, @Param("status") SettlementStatus status);

    @Query("select coalesce(sum(s.payoutVnd), 0) from SellerSettlement s where s.status = :status")
    long sumPayoutByStatus(@Param("status") SettlementStatus status);
}
