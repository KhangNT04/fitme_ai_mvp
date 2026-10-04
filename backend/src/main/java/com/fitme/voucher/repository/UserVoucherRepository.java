package com.fitme.voucher.repository;

import com.fitme.common.enums.VoucherStatus;
import com.fitme.voucher.entity.UserVoucher;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserVoucherRepository extends JpaRepository<UserVoucher, UUID> {

    List<UserVoucher> findByUserIdOrderByExpiresAtAsc(UUID userId);

    List<UserVoucher> findByOrderId(UUID orderId);

    List<UserVoucher> findByStatusInAndExpiresAtBefore(List<VoucherStatus> statuses, Instant before);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from UserVoucher v where v.id = :id")
    Optional<UserVoucher> findByIdForUpdate(@Param("id") UUID id);
}
