package com.fitme.brandvoucher.service;

import com.fitme.brandplus.entity.BrandBillingOrder;
import com.fitme.brandplus.repository.BrandBillingOrderRepository;
import com.fitme.brandvoucher.dto.BrandVoucherDto;
import com.fitme.brandvoucher.entity.BrandVoucher;
import com.fitme.brandvoucher.entity.VoucherCampaign;
import com.fitme.brandvoucher.repository.BrandVoucherRepository;
import com.fitme.brandvoucher.repository.VoucherCampaignRepository;
import com.fitme.common.enums.BrandVoucherStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.ConflictException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Brand-side vouchers and their link to Brand Plus orders. Every transition of a voucher that touches an order
 * runs under a row lock on the voucher, so one voucher can back at most one open or paid order.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BrandVoucherService {

    private final BrandVoucherRepository voucherRepository;
    private final VoucherCampaignRepository campaignRepository;
    private final BrandBillingOrderRepository orderRepository;
    private final AppClock clock;

    @Transactional
    public List<BrandVoucherDto> listForBrand(UUID brandId) {
        Instant now = clock.now();
        expireIssuedBefore(now);
        List<BrandVoucher> vouchers = voucherRepository.findByBrandIdOrderByIssuedAtDescCodeAsc(brandId);
        Map<UUID, String> campaignNames = campaignRepository
                .findAllById(vouchers.stream().map(BrandVoucher::getCampaignId).distinct().toList()).stream()
                .collect(Collectors.toMap(VoucherCampaign::getId, VoucherCampaign::getName));
        Map<UUID, Long> orderCodes = orderRepository
                .findAllById(vouchers.stream().map(BrandVoucher::getReservedOrderId).filter(Objects::nonNull).toList())
                .stream()
                .collect(Collectors.toMap(BrandBillingOrder::getId, BrandBillingOrder::getOrderCode));
        return vouchers.stream()
                .map(voucher -> BrandVoucherDto.builder()
                        .id(voucher.getId())
                        .code(voucher.getCode())
                        .campaignName(campaignNames.get(voucher.getCampaignId()))
                        .discountPercent(voucher.getDiscountPercent())
                        .status(voucher.effectiveStatus(now))
                        .usable(voucher.effectiveStatus(now) == BrandVoucherStatus.ISSUED)
                        .issuedAt(voucher.getIssuedAt())
                        .expiresAt(voucher.getExpiresAt())
                        .usedAt(voucher.getUsedAt())
                        .reservedOrderCode(voucher.getReservedOrderId() != null
                                ? orderCodes.get(voucher.getReservedOrderId())
                                : null)
                        .build())
                .toList();
    }

    /** Read-only lookup for the price preview; same ownership / state rules as checkout. */
    public BrandVoucher requireUsable(UUID brandId, UUID voucherId) {
        BrandVoucher voucher = voucherRepository.findById(voucherId)
                .filter(v -> v.getBrandId().equals(brandId))
                .orElseThrow(BrandVoucherService::notFound);
        requireUsable(voucher, clock.now());
        return voucher;
    }

    /** Locks the voucher row (FOR UPDATE) for the rest of the checkout transaction. */
    @Transactional
    public BrandVoucher lockUsable(UUID brandId, UUID voucherId) {
        BrandVoucher voucher = voucherRepository.findByIdForUpdate(voucherId)
                .filter(v -> v.getBrandId().equals(brandId))
                .orElseThrow(BrandVoucherService::notFound);
        requireUsable(voucher, clock.now());
        return voucher;
    }

    /** Caller holds the lock from {@link #lockUsable}. */
    @Transactional
    public void reserve(BrandVoucher voucher, UUID orderId) {
        voucher.setStatus(BrandVoucherStatus.RESERVED);
        voucher.setReservedOrderId(orderId);
        voucherRepository.save(voucher);
    }

    public Optional<String> codeOf(UUID voucherId) {
        return voucherId == null ? Optional.empty() : voucherRepository.findById(voucherId).map(BrandVoucher::getCode);
    }

    /**
     * The order was paid: its voucher becomes USED. A late payment for an order that was already closed still
     * consumes the voucher if it is free again; if the voucher has meanwhile gone to another order or was revoked,
     * the payment is honoured and the voucher left alone.
     */
    @Transactional
    public void onOrderPaid(BrandBillingOrder order) {
        if (order.getVoucherId() == null) {
            return;
        }
        BrandVoucher voucher = voucherRepository.findByIdForUpdate(order.getVoucherId()).orElse(null);
        if (voucher == null) {
            return;
        }
        boolean heldByThisOrder = voucher.getStatus() == BrandVoucherStatus.RESERVED
                && order.getId().equals(voucher.getReservedOrderId());
        boolean freeAgain = voucher.getStatus() == BrandVoucherStatus.ISSUED
                || voucher.getStatus() == BrandVoucherStatus.EXPIRED;
        if (heldByThisOrder || freeAgain) {
            voucher.setStatus(BrandVoucherStatus.USED);
            voucher.setReservedOrderId(null);
            voucher.setUsedOrderId(order.getId());
            voucher.setUsedAt(clock.now());
            voucherRepository.save(voucher);
        } else if (!order.getId().equals(voucher.getUsedOrderId())) {
            log.warn("Brand Plus order {} paid with voucher {} that is now {} (reserved order {}, used order {})",
                    order.getOrderCode(), voucher.getCode(), voucher.getStatus(), voucher.getReservedOrderId(),
                    voucher.getUsedOrderId());
        }
    }

    /** The order ended unpaid: give its voucher back (EXPIRED if it ran out meanwhile). Idempotent. */
    @Transactional
    public void onOrderClosed(BrandBillingOrder order) {
        if (order.getVoucherId() == null) {
            return;
        }
        voucherRepository.findByIdForUpdate(order.getVoucherId())
                .filter(v -> v.getStatus() == BrandVoucherStatus.RESERVED && order.getId().equals(v.getReservedOrderId()))
                .ifPresent(voucher -> {
                    voucher.setStatus(voucher.isPastExpiry(clock.now())
                            ? BrandVoucherStatus.EXPIRED
                            : BrandVoucherStatus.ISSUED);
                    voucher.setReservedOrderId(null);
                    voucherRepository.save(voucher);
                });
    }

    /** Sweep after unpaid orders are expired in bulk. */
    @Transactional
    public int releaseReservationsOfClosedOrders() {
        int released = voucherRepository.releaseReservationsOfClosedOrders(clock.now());
        if (released > 0) {
            log.info("Released {} voucher(s) held by unpaid Brand Plus orders", released);
        }
        return released;
    }

    @Scheduled(cron = "0 15 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public int expireDue() {
        int expired = expireIssuedBefore(clock.now());
        if (expired > 0) {
            log.info("Expired {} brand voucher(s)", expired);
        }
        return expired;
    }

    @Transactional
    public int expireIssuedBefore(Instant now) {
        return voucherRepository.expireIssuedBefore(now, BrandVoucherStatus.ISSUED, BrandVoucherStatus.EXPIRED);
    }

    private static void requireUsable(BrandVoucher voucher, Instant now) {
        switch (voucher.effectiveStatus(now)) {
            case ISSUED -> {
            }
            case RESERVED -> throw new ConflictException(
                    "Voucher đang được giữ cho một đơn thanh toán chưa hoàn tất. Hãy hủy đơn đó hoặc chờ đơn hết hạn "
                            + "để dùng lại voucher.", "VOUCHER_RESERVED");
            case USED -> throw new BusinessException("Voucher đã được sử dụng", "VOUCHER_USED");
            case REVOKED -> throw new BusinessException("Voucher đã bị thu hồi", "VOUCHER_REVOKED");
            case EXPIRED -> throw new BusinessException("Voucher đã hết hạn", "VOUCHER_EXPIRED");
        }
    }

    private static NotFoundException notFound() {
        return new NotFoundException("Voucher không tồn tại");
    }
}
