package com.fitme.billing.repository;

import com.fitme.billing.entity.BrandBillingOrder;
import com.fitme.common.enums.BillingOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BrandBillingOrderRepository extends JpaRepository<BrandBillingOrder, UUID> {

    Optional<BrandBillingOrder> findByPayosOrderCode(long payosOrderCode);

    List<BrandBillingOrder> findByBrandIdOrderByCreatedAtDesc(UUID brandId);

    List<BrandBillingOrder> findTop10ByBrandIdOrderByCreatedAtDesc(UUID brandId);
}
