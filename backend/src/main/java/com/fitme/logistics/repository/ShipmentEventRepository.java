package com.fitme.logistics.repository;

import com.fitme.logistics.entity.ShipmentEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ShipmentEventRepository extends JpaRepository<ShipmentEvent, UUID> {

    List<ShipmentEvent> findByShipmentIdInOrderByOccurredAtAsc(Collection<UUID> shipmentIds);
}
