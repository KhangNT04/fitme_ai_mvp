package com.fitme.logistics.service;

import com.fitme.common.enums.ShipmentCarrier;
import com.fitme.common.enums.ShipmentStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.InvalidStatusTransitionException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import com.fitme.common.util.EnumParser;
import com.fitme.logistics.dto.ShipOrderRequest;
import com.fitme.logistics.dto.ShipmentDto;
import com.fitme.logistics.dto.ShipmentEventDto;
import com.fitme.logistics.dto.ShipmentEventRequest;
import com.fitme.logistics.entity.Shipment;
import com.fitme.logistics.entity.ShipmentEvent;
import com.fitme.logistics.repository.ShipmentEventRepository;
import com.fitme.logistics.repository.ShipmentRepository;
import com.fitme.order.repository.SellerOrderRepository;
import com.fitme.order.service.OrderFulfillmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final ShipmentEventRepository eventRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final OrderFulfillmentService fulfillmentService;
    private final TrackingCodeGenerator trackingCodeGenerator;
    private final AppClock clock;

    /** Hands a packed seller order to a carrier; the caller has already locked and validated the seller order. */
    @Transactional
    public Shipment create(UUID sellerOrderId, ShipOrderRequest request) {
        ShipmentCarrier carrier = EnumParser.parse(ShipmentCarrier.class, request.getCarrier())
                .orElseThrow(() -> new BusinessException("Đơn vị vận chuyển không hợp lệ"));
        String trackingCode = request.getTrackingCode() == null || request.getTrackingCode().isBlank()
                ? trackingCodeGenerator.next()
                : request.getTrackingCode().trim();
        if (shipmentRepository.existsByTrackingCode(trackingCode)) {
            throw new BusinessException("Mã vận đơn đã tồn tại");
        }
        Shipment shipment = shipmentRepository.save(Shipment.builder()
                .sellerOrderId(sellerOrderId)
                .carrier(carrier)
                .trackingCode(trackingCode)
                .status(ShipmentStatus.READY_TO_PICK)
                .build());
        appendEvent(shipment, ShipmentStatus.READY_TO_PICK, "Đơn hàng sẵn sàng để lấy", null);
        return shipment;
    }

    @Transactional
    public ShipmentDto recordSellerEvent(UUID brandId, UUID shipmentId, ShipmentEventRequest request) {
        UUID sellerOrderId = shipmentRepository.findSellerOrderIdById(shipmentId)
                .orElseThrow(() -> new NotFoundException("Vận đơn không tồn tại"));
        if (!sellerOrderRepository.existsByIdAndBrandId(sellerOrderId, brandId)) {
            throw new AccessDeniedException("Không có quyền truy cập đơn seller");
        }
        return applyEvent(shipmentId, request);
    }

    @Transactional
    public ShipmentDto recordCarrierEvent(String trackingCode, ShipmentEventRequest request) {
        UUID shipmentId = shipmentRepository.findIdByTrackingCode(trackingCode == null ? "" : trackingCode)
                .orElseThrow(() -> new NotFoundException("Mã vận đơn không tồn tại"));
        return applyEvent(shipmentId, request);
    }

    public ShipmentDto toDto(Shipment shipment) {
        return ShipmentDto.from(shipment, eventRepository.findByShipmentIdInOrderByOccurredAtAsc(List.of(shipment.getId()))
                .stream()
                .map(ShipmentEventDto::from)
                .toList());
    }

    /** Shipments (with events) keyed by seller order id; seller orders not yet shipped are absent. */
    public Map<UUID, ShipmentDto> findBySellerOrderIds(Collection<UUID> sellerOrderIds) {
        if (sellerOrderIds.isEmpty()) {
            return Map.of();
        }
        List<Shipment> shipments = shipmentRepository.findBySellerOrderIdIn(sellerOrderIds);
        if (shipments.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<ShipmentEventDto>> events = eventRepository.findByShipmentIdInOrderByOccurredAtAsc(
                        shipments.stream().map(Shipment::getId).toList()).stream()
                .collect(Collectors.groupingBy(ShipmentEvent::getShipmentId, LinkedHashMap::new,
                        Collectors.mapping(ShipmentEventDto::from, Collectors.toList())));
        Map<UUID, ShipmentDto> result = new HashMap<>();
        shipments.forEach(shipment -> result.put(shipment.getSellerOrderId(),
                ShipmentDto.from(shipment, events.getOrDefault(shipment.getId(), List.of()))));
        return result;
    }

    private ShipmentDto applyEvent(UUID shipmentId, ShipmentEventRequest request) {
        ShipmentStatus next = EnumParser.parse(ShipmentStatus.class, request.getStatus())
                .orElseThrow(() -> new BusinessException("Trạng thái vận đơn không hợp lệ"));
        Shipment shipment = shipmentRepository.findByIdForUpdate(shipmentId)
                .orElseThrow(() -> new NotFoundException("Vận đơn không tồn tại"));
        if (shipment.getStatus() == ShipmentStatus.DELIVERED && next != ShipmentStatus.DELIVERED) {
            throw new InvalidStatusTransitionException();
        }
        if (shipment.getStatus() != next) {
            shipment.setStatus(next);
            shipmentRepository.save(shipment);
            appendEvent(shipment, next, request.getDescription(), request.getLocation());
        }
        if (next == ShipmentStatus.DELIVERED) {
            fulfillmentService.markSellerOrderDelivered(shipment.getSellerOrderId());
        }
        return toDto(shipment);
    }

    private void appendEvent(Shipment shipment, ShipmentStatus status, String description, String location) {
        eventRepository.save(ShipmentEvent.builder()
                .shipmentId(shipment.getId())
                .status(status)
                .description(description)
                .location(location)
                .occurredAt(clock.now())
                .build());
    }
}
