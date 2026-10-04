package com.fitme.settlement.service;

import com.fitme.common.enums.OrderStatus;
import com.fitme.common.enums.SellerOrderStatus;
import com.fitme.common.time.AppClock;
import com.fitme.order.repository.OrderRepository;
import com.fitme.order.repository.SellerOrderRepository;
import com.fitme.settlement.dto.CommerceSummaryDto;
import com.fitme.settlement.dto.SalesSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/** Dashboard aggregates: per-brand sales and the admin marketplace overview. */
@Service
@RequiredArgsConstructor
public class CommerceReportService {

    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final SettlementService settlementService;
    private final AppClock clock;

    public SalesSummaryDto salesSummary(UUID brandId) {
        Instant since = clock.now().minus(30, ChronoUnit.DAYS);
        return SalesSummaryDto.builder()
                .ordersLast30Days(sellerOrderRepository.countByBrandIdAndCreatedAtGreaterThanEqual(brandId, since))
                .revenueLast30DaysVnd(sellerOrderRepository.sumSubtotalSince(brandId, since, SellerOrderStatus.CANCELLED))
                .deliveredCount(sellerOrderRepository.countByBrandIdAndStatus(brandId, SellerOrderStatus.DELIVERED))
                .cancelledCount(sellerOrderRepository.countByBrandIdAndStatus(brandId, SellerOrderStatus.CANCELLED))
                .build();
    }

    public CommerceSummaryDto commerceSummary() {
        return CommerceSummaryDto.builder()
                .gmvVnd(orderRepository.sumTotalByStatus(OrderStatus.COMPLETED))
                .ordersCount(orderRepository.count())
                .commissionVnd(sellerOrderRepository.sumCommissionByStatus(SellerOrderStatus.DELIVERED))
                .pendingSettlementVnd(settlementService.pendingPayoutTotal())
                .build();
    }
}
