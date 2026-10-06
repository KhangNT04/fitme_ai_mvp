package com.fitme.tryon.service;

import com.fitme.brandplus.service.BrandPlusService;
import com.fitme.common.enums.PlusFreeTryOnStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.time.AppClock;
import com.fitme.fitken.service.FitkenService;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.settings.service.SystemSettingsService;
import com.fitme.tryon.dto.TryOnQuoteResponse;
import com.fitme.tryon.entity.PlusFreeTryOnUsage;
import com.fitme.tryon.repository.PlusFreeTryOnUsageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Free daily AI try-ons for outfits made only of Brand Plus products ({@code tryon.plus_free_daily} per
 * Asia/Ho_Chi_Minh day). A try-on is either free or charged in Fitken, never both: the free try and the
 * Fitken charge share the preview generation id as reference and the caller picks exactly one of them.
 */
@Service
@RequiredArgsConstructor
public class PlusFreeTryOnService {

    static final int MAX_QUOTE_PRODUCTS = 20;

    private final PlusFreeTryOnUsageRepository usageRepository;
    private final BrandPlusService brandPlusService;
    private final ProductRepository productRepository;
    private final FitkenService fitkenService;
    private final SystemSettingsService settingsService;
    private final AppClock clock;

    public int dailyLimit() {
        return settingsService.tryOnPlusFreeDaily();
    }

    public int remainingToday(UUID userId) {
        if (userId == null) {
            return 0;
        }
        long used = usageRepository.countByUserIdAndUsageDateAndStatus(
                userId, clock.today(), PlusFreeTryOnStatus.USED);
        return (int) Math.max(0, dailyLimit() - used);
    }

    /** True when there is at least one product and every one belongs to an active Brand Plus brand. */
    public boolean allPlus(Collection<UUID> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return false;
        }
        Set<UUID> distinct = Set.copyOf(productIds);
        List<Product> products = productRepository.findAllById(distinct);
        if (products.size() != distinct.size()) {
            return false;
        }
        Set<UUID> plusBrandIds = brandPlusService.activePlusBrandIds();
        return products.stream().allMatch(p -> p.getBrandId() != null && plusBrandIds.contains(p.getBrandId()));
    }

    /**
     * Spends one of today's free tries on {@code tryOnRef}. Concurrent try-ons of the same user are serialized
     * on the Fitken wallet row (the lock Fitken charges take too, so the lock order never inverts); the count
     * is re-read under that lock, and the unique {@code try_on_ref} makes a repeated call a no-op.
     *
     * @return true when the try-on is covered by a free try (now or by an earlier call with the same ref)
     */
    @Transactional
    public boolean tryConsume(UUID userId, UUID tryOnRef) {
        fitkenService.lockWallet(userId);
        Optional<PlusFreeTryOnUsage> existing = usageRepository.findByTryOnRef(tryOnRef);
        if (existing.isPresent()) {
            return existing.get().getStatus() == PlusFreeTryOnStatus.USED
                    && userId.equals(existing.get().getUserId());
        }
        if (remainingToday(userId) <= 0) {
            return false;
        }
        usageRepository.saveAndFlush(PlusFreeTryOnUsage.builder()
                .userId(userId)
                .usageDate(clock.today())
                .tryOnRef(tryOnRef)
                .status(PlusFreeTryOnStatus.USED)
                .build());
        return true;
    }

    /** Gives the free try back after a failed render. No-op when the ref used no free try or was refunded. */
    @Transactional
    public boolean refund(UUID tryOnRef) {
        return usageRepository.markRefunded(tryOnRef, PlusFreeTryOnStatus.USED, PlusFreeTryOnStatus.REFUNDED,
                clock.now()) > 0;
    }

    public TryOnQuoteResponse quote(UUID userId, List<UUID> productIds) {
        if (productIds != null && productIds.size() > MAX_QUOTE_PRODUCTS) {
            throw new BusinessException("Tối đa " + MAX_QUOTE_PRODUCTS + " sản phẩm cho một lượt thử đồ");
        }
        boolean allPlus = allPlus(productIds);
        int remaining = remainingToday(userId);
        return TryOnQuoteResponse.builder()
                .free(allPlus && remaining > 0)
                .freeRemainingToday(remaining)
                .freeDailyLimit(dailyLimit())
                .fitkenCost(fitkenService.tryOnCost())
                .allPlus(allPlus)
                .build();
    }
}
