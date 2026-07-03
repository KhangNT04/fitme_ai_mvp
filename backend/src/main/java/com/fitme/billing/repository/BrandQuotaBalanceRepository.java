package com.fitme.billing.repository;

import com.fitme.billing.entity.BrandQuotaBalance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BrandQuotaBalanceRepository extends JpaRepository<BrandQuotaBalance, UUID> {
}
