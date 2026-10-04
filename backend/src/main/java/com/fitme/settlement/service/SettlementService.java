package com.fitme.settlement.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.SellerOrderStatus;
import com.fitme.common.enums.SettlementStatus;
import com.fitme.common.exception.InvalidStatusTransitionException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import com.fitme.common.util.EnumParser;
import com.fitme.order.entity.SellerOrder;
import com.fitme.order.repository.SellerOrderRepository;
import com.fitme.settlement.dto.SettlementDto;
import com.fitme.settlement.dto.SettlementSummaryDto;
import com.fitme.settlement.entity.SellerSettlement;
import com.fitme.settlement.repository.SellerSettlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Seller payouts. A DELIVERED seller order becomes eligible {@code settlement-hold-days} after delivery
 * (return window); admin batches eligible orders per brand into a PENDING settlement, then marks it PAID.
 */
@Service
@RequiredArgsConstructor
public class SettlementService {

    private final SellerSettlementRepository settlementRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final BrandRepository brandRepository;
    private final FitMeProperties properties;
    private final AppClock clock;

    public List<SettlementDto> listForBrand(UUID brandId) {
        return toDtos(settlementRepository.findByBrandIdOrderByCreatedAtDesc(brandId));
    }

    public SettlementSummaryDto summary(UUID brandId) {
        Instant eligibleAt = holdCutoff();
        Instant earliest = sellerOrderRepository.findEarliestUnsettledDelivery(brandId, SellerOrderStatus.DELIVERED);
        return SettlementSummaryDto.builder()
                .pendingVnd(sellerOrderRepository.sumUnsettledPayoutDeliveredAfter(
                        brandId, SellerOrderStatus.DELIVERED, eligibleAt))
                .eligibleVnd(sellerOrderRepository.sumUnsettledPayoutDeliveredUntil(
                        brandId, SellerOrderStatus.DELIVERED, eligibleAt))
                .paidVnd(settlementRepository.sumPayoutByBrandAndStatus(brandId, SettlementStatus.PAID))
                .nextEligibleAt(earliest == null ? null : earliest.plus(holdDays(), ChronoUnit.DAYS))
                .build();
    }

    public List<SettlementDto> adminList(String status, UUID brandId) {
        Optional<SettlementStatus> parsed = EnumParser.parse(SettlementStatus.class, status);
        if (status != null && parsed.isEmpty()) {
            return List.of();
        }
        List<SellerSettlement> settlements;
        if (parsed.isPresent() && brandId != null) {
            settlements = settlementRepository.findByBrandIdAndStatusOrderByCreatedAtDesc(brandId, parsed.get());
        } else if (parsed.isPresent()) {
            settlements = settlementRepository.findByStatusOrderByCreatedAtDesc(parsed.get());
        } else if (brandId != null) {
            settlements = settlementRepository.findByBrandIdOrderByCreatedAtDesc(brandId);
        } else {
            settlements = settlementRepository.findAllByOrderByCreatedAtDesc();
        }
        return toDtos(settlements);
    }

    /** One PENDING settlement per brand that has eligible orders ({@code brandId} null = all brands). */
    @Transactional
    public List<SettlementDto> generate(UUID brandId) {
        Instant cutoff = holdCutoff();
        List<UUID> brandIds = brandId != null
                ? List.of(brandId)
                : sellerOrderRepository.findBrandIdsWithUnsettled(SellerOrderStatus.DELIVERED, cutoff);
        List<SellerSettlement> created = new ArrayList<>();
        for (UUID id : brandIds) {
            List<SellerOrder> orders = sellerOrderRepository.findUnsettledForUpdate(id, SellerOrderStatus.DELIVERED, cutoff);
            if (orders.isEmpty()) {
                continue;
            }
            SellerSettlement settlement = settlementRepository.save(SellerSettlement.builder()
                    .brandId(id)
                    .status(SettlementStatus.PENDING)
                    .subtotalVnd(orders.stream().mapToLong(SellerOrder::getSubtotalVnd).sum())
                    .commissionVnd(orders.stream().mapToLong(SellerOrder::getCommissionVnd).sum())
                    .payoutVnd(orders.stream().mapToLong(SellerOrder::getPayoutVnd).sum())
                    .build());
            orders.forEach(order -> order.setSettlementId(settlement.getId()));
            sellerOrderRepository.saveAll(orders);
            created.add(settlement);
        }
        return toDtos(created);
    }

    @Transactional
    public SettlementDto markPaid(UUID settlementId, String payoutRef) {
        SellerSettlement settlement = settlementRepository.findByIdForUpdate(settlementId)
                .orElseThrow(() -> new NotFoundException("Kỳ đối soát không tồn tại"));
        if (settlement.getStatus() != SettlementStatus.PENDING) {
            throw new InvalidStatusTransitionException();
        }
        settlement.setStatus(SettlementStatus.PAID);
        settlement.setPayoutRef(payoutRef);
        settlement.setPaidAt(clock.now());
        return toDtos(List.of(settlementRepository.save(settlement))).getFirst();
    }

    public long pendingPayoutTotal() {
        return settlementRepository.sumPayoutByStatus(SettlementStatus.PENDING);
    }

    private List<SettlementDto> toDtos(List<SellerSettlement> settlements) {
        if (settlements.isEmpty()) {
            return List.of();
        }
        Map<UUID, String> brandNames = brandRepository.findAllById(settlements.stream()
                        .map(SellerSettlement::getBrandId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Brand::getId, Brand::getName));
        Map<UUID, Long> orderCounts = sellerOrderRepository.countBySettlementIds(
                        settlements.stream().map(SellerSettlement::getId).toList()).stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> ((Number) row[1]).longValue()));
        return settlements.stream()
                .map(settlement -> SettlementDto.from(settlement, brandNames.get(settlement.getBrandId()),
                        orderCounts.getOrDefault(settlement.getId(), 0L)))
                .toList();
    }

    private Instant holdCutoff() {
        return clock.now().minus(holdDays(), ChronoUnit.DAYS);
    }

    private int holdDays() {
        return properties.getCommerce().getSettlementHoldDays();
    }
}
