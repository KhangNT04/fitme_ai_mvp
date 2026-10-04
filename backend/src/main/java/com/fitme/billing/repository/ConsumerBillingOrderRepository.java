package com.fitme.billing.repository;

import com.fitme.billing.entity.ConsumerBillingOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConsumerBillingOrderRepository extends JpaRepository<ConsumerBillingOrder, UUID> {

    Optional<ConsumerBillingOrder> findByPayosOrderCode(long payosOrderCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ConsumerBillingOrder o where o.payosOrderCode = :orderCode")
    Optional<ConsumerBillingOrder> findByPayosOrderCodeForUpdate(@Param("orderCode") long orderCode);

    boolean existsByPayosOrderCode(long payosOrderCode);

    boolean existsByPlanId(UUID planId);

    List<ConsumerBillingOrder> findTop10ByUserIdOrderByCreatedAtDesc(UUID userId);
}
