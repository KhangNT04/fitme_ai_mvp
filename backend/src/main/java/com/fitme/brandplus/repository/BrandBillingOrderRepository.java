package com.fitme.brandplus.repository;

import com.fitme.brandplus.entity.BrandBillingOrder;
import com.fitme.common.enums.BillingOrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BrandBillingOrderRepository extends JpaRepository<BrandBillingOrder, UUID> {

    Optional<BrandBillingOrder> findByOrderCode(long orderCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from BrandBillingOrder o where o.orderCode = :orderCode")
    Optional<BrandBillingOrder> findByOrderCodeForUpdate(@Param("orderCode") long orderCode);

    Optional<BrandBillingOrder> findFirstByBrandIdAndStatusOrderByCreatedAtDesc(UUID brandId,
                                                                                 BillingOrderStatus status);

    boolean existsByPlanId(UUID planId);
}
