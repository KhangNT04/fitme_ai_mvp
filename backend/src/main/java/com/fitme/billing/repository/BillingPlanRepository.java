package com.fitme.billing.repository;

import com.fitme.billing.entity.BillingPlan;
import com.fitme.common.enums.BillingPlanType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BillingPlanRepository extends JpaRepository<BillingPlan, UUID> {

    Optional<BillingPlan> findByCode(String code);

    List<BillingPlan> findByActiveTrueOrderBySortOrderAsc();

    List<BillingPlan> findAllByOrderBySortOrderAsc();
}
