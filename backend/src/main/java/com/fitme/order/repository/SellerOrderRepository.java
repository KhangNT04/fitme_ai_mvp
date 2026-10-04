package com.fitme.order.repository;

import com.fitme.common.enums.SellerOrderStatus;
import com.fitme.order.entity.SellerOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SellerOrderRepository extends JpaRepository<SellerOrder, UUID> {

    List<SellerOrder> findByOrderId(UUID orderId);

    List<SellerOrder> findByOrderIdIn(Collection<UUID> orderIds);

    List<SellerOrder> findByBrandIdOrderByCreatedAtDesc(UUID brandId);

    List<SellerOrder> findByBrandIdAndStatusOrderByCreatedAtDesc(UUID brandId, SellerOrderStatus status);

    boolean existsByIdAndBrandId(UUID id, UUID brandId);

    boolean existsByOrderIdAndStatusIn(UUID orderId, Collection<SellerOrderStatus> statuses);

    boolean existsByOrderIdAndStatusNotIn(UUID orderId, Collection<SellerOrderStatus> statuses);

    long countByBrandIdAndCreatedAtGreaterThanEqual(UUID brandId, Instant since);

    long countByBrandIdAndStatus(UUID brandId, SellerOrderStatus status);

    @Query("select so.orderId from SellerOrder so where so.id = :id")
    Optional<UUID> findOrderIdById(@Param("id") UUID id);

    @Query("select so.brandId from SellerOrder so where so.id = :id")
    Optional<UUID> findBrandIdById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select so from SellerOrder so where so.id = :id")
    Optional<SellerOrder> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            select coalesce(sum(so.subtotalVnd), 0) from SellerOrder so
            where so.brandId = :brandId and so.createdAt >= :since and so.status <> :excluded
            """)
    long sumSubtotalSince(@Param("brandId") UUID brandId, @Param("since") Instant since,
                          @Param("excluded") SellerOrderStatus excluded);

    @Query("select coalesce(sum(so.commissionVnd), 0) from SellerOrder so where so.status = :status")
    long sumCommissionByStatus(@Param("status") SellerOrderStatus status);

    @Query("""
            select coalesce(sum(so.payoutVnd), 0) from SellerOrder so
            where so.brandId = :brandId and so.status = :status and so.settlementId is null
              and so.deliveredAt > :eligibleAt
            """)
    long sumUnsettledPayoutDeliveredAfter(@Param("brandId") UUID brandId, @Param("status") SellerOrderStatus status,
                                          @Param("eligibleAt") Instant eligibleAt);

    @Query("""
            select coalesce(sum(so.payoutVnd), 0) from SellerOrder so
            where so.brandId = :brandId and so.status = :status and so.settlementId is null
              and so.deliveredAt <= :eligibleAt
            """)
    long sumUnsettledPayoutDeliveredUntil(@Param("brandId") UUID brandId, @Param("status") SellerOrderStatus status,
                                          @Param("eligibleAt") Instant eligibleAt);

    @Query("""
            select min(so.deliveredAt) from SellerOrder so
            where so.brandId = :brandId and so.status = :status and so.settlementId is null
            """)
    Instant findEarliestUnsettledDelivery(@Param("brandId") UUID brandId, @Param("status") SellerOrderStatus status);

    @Query("""
            select distinct so.brandId from SellerOrder so
            where so.status = :status and so.settlementId is null and so.deliveredAt <= :cutoff
            """)
    List<UUID> findBrandIdsWithUnsettled(@Param("status") SellerOrderStatus status, @Param("cutoff") Instant cutoff);

    /** Rows of {@code [settlementId, orderCount]}. */
    @Query("""
            select so.settlementId, count(so) from SellerOrder so
            where so.settlementId in :settlementIds group by so.settlementId
            """)
    List<Object[]> countBySettlementIds(@Param("settlementIds") Collection<UUID> settlementIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select so from SellerOrder so
            where so.brandId = :brandId and so.status = :status and so.settlementId is null
              and so.deliveredAt <= :cutoff
            """)
    List<SellerOrder> findUnsettledForUpdate(@Param("brandId") UUID brandId, @Param("status") SellerOrderStatus status,
                                             @Param("cutoff") Instant cutoff);
}
