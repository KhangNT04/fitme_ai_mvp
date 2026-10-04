package com.fitme.logistics.repository;

import com.fitme.logistics.entity.Shipment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShipmentRepository extends JpaRepository<Shipment, UUID> {

    List<Shipment> findBySellerOrderIdIn(Collection<UUID> sellerOrderIds);

    boolean existsByTrackingCode(String trackingCode);

    @Query("select s.id from Shipment s where s.trackingCode = :trackingCode")
    Optional<UUID> findIdByTrackingCode(@Param("trackingCode") String trackingCode);

    @Query("select s.sellerOrderId from Shipment s where s.id = :id")
    Optional<UUID> findSellerOrderIdById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Shipment s where s.id = :id")
    Optional<Shipment> findByIdForUpdate(@Param("id") UUID id);
}
