package com.fitme.brandvoucher.repository;

import com.fitme.brandvoucher.entity.BrandVoucher;
import com.fitme.common.enums.BrandVoucherStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface BrandVoucherRepository extends JpaRepository<BrandVoucher, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from BrandVoucher v where v.id = :id")
    Optional<BrandVoucher> findByIdForUpdate(@Param("id") UUID id);

    List<BrandVoucher> findByBrandIdOrderByIssuedAtDescCodeAsc(UUID brandId);

    List<BrandVoucher> findByCampaignIdOrderByIssuedAtDescCodeAsc(UUID campaignId);

    boolean existsByCode(String code);

    @Query("select distinct v.brandId from BrandVoucher v where v.campaignId = :campaignId")
    Set<UUID> findBrandIdsByCampaignId(@Param("campaignId") UUID campaignId);

    /** Rows of [campaignId, status, count]. */
    @Query("select v.campaignId, v.status, count(v) from BrandVoucher v group by v.campaignId, v.status")
    List<Object[]> countByCampaignAndStatus();

    /** Rows of [campaignId, distinct brand count]. */
    @Query("select v.campaignId, count(distinct v.brandId) from BrandVoucher v group by v.campaignId")
    List<Object[]> countBrandsByCampaign();

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update BrandVoucher v set v.status = :expired, v.updatedAt = :now "
            + "where v.status = :issued and v.expiresAt < :now")
    int expireIssuedBefore(@Param("now") Instant now,
                           @Param("issued") BrandVoucherStatus issued,
                           @Param("expired") BrandVoucherStatus expired);

    /** Frees vouchers still RESERVED by orders that ended unpaid (FAILED, CANCELLED or EXPIRED). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE brand_vouchers v SET "
            + "status = CASE WHEN v.expires_at IS NOT NULL AND v.expires_at < :now THEN 'EXPIRED' ELSE 'ISSUED' END, "
            + "reserved_order_id = NULL, updated_at = :now "
            + "FROM brand_billing_orders o "
            + "WHERE v.reserved_order_id = o.id AND v.status = 'RESERVED' "
            + "AND o.status IN ('FAILED', 'CANCELLED', 'EXPIRED')", nativeQuery = true)
    int releaseReservationsOfClosedOrders(@Param("now") Instant now);
}
