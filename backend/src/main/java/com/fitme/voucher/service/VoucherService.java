package com.fitme.voucher.service;

import com.fitme.common.enums.VoucherStatus;
import com.fitme.common.enums.VoucherType;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.voucher.dto.UserVoucherDto;
import com.fitme.voucher.entity.UserVoucher;
import com.fitme.voucher.repository.UserVoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VoucherService {

    public static final String SOURCE_PRO_SUBSCRIPTION = "PRO_SUBSCRIPTION";
    public static final String SOURCE_ADMIN = "ADMIN";

    private final UserVoucherRepository voucherRepository;

    @Transactional
    public List<UserVoucher> grantFreeship(UUID userId, int count, long maxDiscountVnd, Instant expiresAt,
                                           String sourceType, UUID sourceRef) {
        List<UserVoucher> granted = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            granted.add(voucherRepository.save(UserVoucher.builder()
                    .userId(userId)
                    .voucherType(VoucherType.FREESHIP)
                    .status(VoucherStatus.AVAILABLE)
                    .maxDiscountVnd(maxDiscountVnd)
                    .sourceType(sourceType)
                    .sourceRef(sourceRef)
                    .expiresAt(expiresAt)
                    .build()));
        }
        return granted;
    }

    public List<UserVoucherDto> listForUser(UUID userId) {
        return voucherRepository.findByUserIdOrderByExpiresAtAsc(userId).stream()
                .map(VoucherService::toDto)
                .toList();
    }

    /**
     * Attaches an AVAILABLE voucher to an order being placed. The discount applied is
     * {@code min(shippingFee, voucher.maxDiscountVnd)} — computed by the caller.
     */
    @Transactional
    public UserVoucher reserveForOrder(UUID userId, UUID voucherId, UUID orderId) {
        UserVoucher voucher = voucherRepository.findByIdForUpdate(voucherId)
                .orElseThrow(() -> new NotFoundException("Voucher không tồn tại"));
        if (!voucher.getUserId().equals(userId)) {
            throw new BusinessException("Voucher không thuộc tài khoản của bạn");
        }
        if (voucher.getStatus() != VoucherStatus.AVAILABLE) {
            throw new BusinessException("Voucher đã được sử dụng hoặc không còn khả dụng");
        }
        if (!voucher.getExpiresAt().isAfter(Instant.now())) {
            voucher.setStatus(VoucherStatus.EXPIRED);
            voucherRepository.save(voucher);
            throw new BusinessException("Voucher đã hết hạn");
        }
        voucher.setStatus(VoucherStatus.RESERVED);
        voucher.setOrderId(orderId);
        return voucherRepository.save(voucher);
    }

    /** Order paid (online) or placed as COD: the reserved voucher is consumed for good. */
    @Transactional
    public void markUsedForOrder(UUID orderId) {
        for (UserVoucher voucher : voucherRepository.findByOrderId(orderId)) {
            if (voucher.getStatus() == VoucherStatus.RESERVED) {
                voucher.setStatus(VoucherStatus.USED);
                voucher.setUsedAt(Instant.now());
                voucherRepository.save(voucher);
            }
        }
    }

    /** Order cancelled / payment timed out: give the voucher back if it is still valid. */
    @Transactional
    public void releaseForOrder(UUID orderId) {
        Instant now = Instant.now();
        for (UserVoucher voucher : voucherRepository.findByOrderId(orderId)) {
            if (voucher.getStatus() == VoucherStatus.RESERVED || voucher.getStatus() == VoucherStatus.USED) {
                voucher.setOrderId(null);
                voucher.setUsedAt(null);
                voucher.setStatus(voucher.getExpiresAt().isAfter(now)
                        ? VoucherStatus.AVAILABLE
                        : VoucherStatus.EXPIRED);
                voucherRepository.save(voucher);
            }
        }
    }

    @Scheduled(cron = "0 15 1 * * *")
    @Transactional
    public void expireVouchers() {
        voucherRepository.findByStatusInAndExpiresAtBefore(List.of(VoucherStatus.AVAILABLE), Instant.now())
                .forEach(voucher -> {
                    voucher.setStatus(VoucherStatus.EXPIRED);
                    voucherRepository.save(voucher);
                });
    }

    public static UserVoucherDto toDto(UserVoucher voucher) {
        return UserVoucherDto.builder()
                .id(voucher.getId())
                .voucherType(voucher.getVoucherType())
                .status(voucher.getStatus())
                .maxDiscountVnd(voucher.getMaxDiscountVnd())
                .sourceType(voucher.getSourceType())
                .orderId(voucher.getOrderId())
                .expiresAt(voucher.getExpiresAt())
                .usedAt(voucher.getUsedAt())
                .createdAt(voucher.getCreatedAt())
                .build();
    }
}
