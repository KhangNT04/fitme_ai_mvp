package com.fitme.order.repository;

import com.fitme.order.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {

    List<OrderItem> findBySellerOrderId(UUID sellerOrderId);

    List<OrderItem> findBySellerOrderIdIn(Collection<UUID> sellerOrderIds);
}
