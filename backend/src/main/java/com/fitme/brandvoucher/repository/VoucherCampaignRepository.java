package com.fitme.brandvoucher.repository;

import com.fitme.brandvoucher.entity.VoucherCampaign;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VoucherCampaignRepository extends JpaRepository<VoucherCampaign, UUID> {

    List<VoucherCampaign> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from VoucherCampaign c where c.id = :id")
    Optional<VoucherCampaign> findByIdForUpdate(@Param("id") UUID id);
}
