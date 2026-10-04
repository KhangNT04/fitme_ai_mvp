package com.fitme.order.repository;

import com.fitme.common.enums.OrderStatus;
import com.fitme.order.entity.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Order> findByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, OrderStatus status);

    List<Order> findAllByOrderByCreatedAtDesc();

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);

    @Query("select o.id from CustomerOrder o where o.userId = :userId and o.payosOrderCode = :code")
    Optional<UUID> findIdByUserIdAndPayosOrderCode(@Param("userId") UUID userId, @Param("code") Long code);

    boolean existsByPayosOrderCode(Long payosOrderCode);

    boolean existsByOrderCode(String orderCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from CustomerOrder o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from CustomerOrder o where o.payosOrderCode = :code")
    Optional<Order> findByPayosOrderCodeForUpdate(@Param("code") Long code);

    @Query("select o.id from CustomerOrder o where o.status = :status and o.createdAt < :cutoff")
    List<UUID> findIdsByStatusCreatedBefore(@Param("status") OrderStatus status, @Param("cutoff") Instant cutoff);

    @Query("select coalesce(sum(o.totalVnd), 0) from CustomerOrder o where o.status = :status")
    long sumTotalByStatus(@Param("status") OrderStatus status);
}
