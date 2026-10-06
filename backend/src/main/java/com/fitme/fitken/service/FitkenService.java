package com.fitme.fitken.service;

import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.FitkenEntryType;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.time.AppClock;
import com.fitme.fitken.entity.FitkenLedgerEntry;
import com.fitme.fitken.entity.FitkenWallet;
import com.fitme.fitken.repository.FitkenLedgerRepository;
import com.fitme.fitken.repository.FitkenWalletRepository;
import com.fitme.settings.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Consumer Fitken wallet. Every balance mutation locks the wallet row (SELECT ... FOR UPDATE)
 * so concurrent try-ons / rewards for the same user are serialized and cannot double-spend.
 */
@Service
@RequiredArgsConstructor
public class FitkenService {

    public static final String REF_PREVIEW_GENERATION = "PREVIEW_GENERATION";
    public static final String REF_BILLING_ORDER = "CONSUMER_BILLING_ORDER";
    public static final String REF_SUBSCRIPTION = "CONSUMER_SUBSCRIPTION";
    public static final String REF_ADMIN = "ADMIN";

    public static final String INSUFFICIENT_MESSAGE =
            "Bạn đã hết Fitken. Nâng cấp FitMe Premium để nhận Fitken hàng tháng hoặc nhận thưởng để tiếp tục thử đồ AI.";

    public enum Bucket { SUBSCRIPTION, BONUS }

    private static final Set<FitkenEntryType> CAPPED_SOURCES = EnumSet.of(
            FitkenEntryType.TRIAL_GRANT,
            FitkenEntryType.CHECKIN_REWARD,
            FitkenEntryType.SHARE_REWARD,
            FitkenEntryType.REVIEW_REWARD);

    private final FitkenWalletRepository walletRepository;
    private final FitkenLedgerRepository ledgerRepository;
    private final FitMeProperties properties;
    private final SystemSettingsService settingsService;
    private final AppClock clock;

    public int tryOnCost() {
        return Math.max(1, properties.getFitken().getTryOnCost());
    }

    /** Returns the locked wallet, creating it (with the one-time trial grant) on first access. */
    @Transactional
    public FitkenWallet lockWallet(UUID userId) {
        walletRepository.insertIfAbsent(userId);
        FitkenWallet wallet = walletRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalStateException("Không tạo được ví Fitken"));
        if (wallet.getTrialGrantedAt() == null) {
            wallet.setTrialGrantedAt(clock.now());
            int trial = capFreeGrant(wallet, FitkenEntryType.TRIAL_GRANT,
                    Math.max(0, properties.getFitken().getTrialAmount()));
            if (trial > 0) {
                wallet.setBonusRemaining(wallet.getBonusRemaining() + trial);
                appendLedger(wallet, FitkenEntryType.TRIAL_GRANT, 0, trial, null, null,
                        "Tặng " + trial + " Fitken dùng thử");
            }
            walletRepository.save(wallet);
        }
        return wallet;
    }

    @Transactional
    public FitkenWallet getWallet(UUID userId) {
        return lockWallet(userId);
    }

    /** Read-only lookup that does not create the wallet (admin views). */
    public Optional<FitkenWallet> findWallet(UUID userId) {
        return walletRepository.findById(userId);
    }

    @Transactional
    public int balance(UUID userId) {
        return lockWallet(userId).balance();
    }

    @Transactional
    public void assertCanAfford(UUID userId, int amount) {
        if (lockWallet(userId).balance() < amount) {
            throw new BusinessException(INSUFFICIENT_MESSAGE, "FITKEN_INSUFFICIENT");
        }
    }

    /**
     * Spends Fitken for one AI action, subscription bucket first. Idempotent per reference:
     * a second call with the same reference is a no-op.
     */
    @Transactional
    public FitkenWallet consume(UUID userId, int amount, String referenceType, UUID referenceId, String note) {
        FitkenWallet wallet = lockWallet(userId);
        if (ledgerRepository.existsByEntryTypeAndReferenceTypeAndReferenceId(
                FitkenEntryType.CONSUME, referenceType, referenceId)) {
            return wallet;
        }
        if (wallet.balance() < amount) {
            throw new BusinessException(INSUFFICIENT_MESSAGE, "FITKEN_INSUFFICIENT");
        }
        int fromSubscription = Math.min(amount, wallet.getSubscriptionRemaining());
        int fromBonus = amount - fromSubscription;
        wallet.setSubscriptionRemaining(wallet.getSubscriptionRemaining() - fromSubscription);
        wallet.setBonusRemaining(wallet.getBonusRemaining() - fromBonus);
        walletRepository.save(wallet);
        appendLedger(wallet, FitkenEntryType.CONSUME, -fromSubscription, -fromBonus,
                referenceType, referenceId, note);
        return wallet;
    }

    @Transactional
    public FitkenWallet consumeForTryOn(UUID userId, UUID previewGenerationId) {
        return consume(userId, tryOnCost(), REF_PREVIEW_GENERATION, previewGenerationId, "Thử đồ AI");
    }

    /**
     * Reverses a previous CONSUME into the same buckets it came from. No-op when nothing was
     * consumed for the reference or it was already refunded.
     */
    @Transactional
    public boolean refund(String referenceType, UUID referenceId, String note) {
        Optional<FitkenLedgerEntry> consumed = ledgerRepository.findFirstByEntryTypeAndReferenceTypeAndReferenceId(
                FitkenEntryType.CONSUME, referenceType, referenceId);
        if (consumed.isEmpty()) {
            return false;
        }
        FitkenLedgerEntry entry = consumed.get();
        FitkenWallet wallet = lockWallet(entry.getUserId());
        if (ledgerRepository.existsByEntryTypeAndReferenceTypeAndReferenceId(
                FitkenEntryType.REFUND, referenceType, referenceId)) {
            return false;
        }
        wallet.setSubscriptionRemaining(wallet.getSubscriptionRemaining() - entry.getSubscriptionDelta());
        wallet.setBonusRemaining(wallet.getBonusRemaining() - entry.getBonusDelta());
        walletRepository.save(wallet);
        appendLedger(wallet, FitkenEntryType.REFUND, -entry.getSubscriptionDelta(), -entry.getBonusDelta(),
                referenceType, referenceId, note);
        return true;
    }

    @Transactional
    public boolean refundTryOn(UUID previewGenerationId, String note) {
        return refund(REF_PREVIEW_GENERATION, previewGenerationId,
                note != null ? note : "Hoàn Fitken do thử đồ AI không thành công");
    }

    /** Admin-editable cap on the balance that free Fitken (trial / rewards) can top a wallet up to. */
    public int maxFreeBalance() {
        return settingsService.fitkenMaxBalance();
    }

    /** Free sources stop at {@link #maxFreeBalance()}; paid, subscription, admin and refund credits are never capped. */
    public static boolean isCappedSource(FitkenEntryType type) {
        return CAPPED_SOURCES.contains(type);
    }

    private int capFreeGrant(FitkenWallet wallet, FitkenEntryType type, int amount) {
        if (amount <= 0 || !isCappedSource(type)) {
            return Math.max(0, amount);
        }
        return Math.min(amount, Math.max(0, maxFreeBalance() - wallet.balance()));
    }

    /**
     * Credits Fitken. When a reference is given the grant is idempotent per (type, reference).
     * Free sources are capped so the balance never exceeds {@link #maxFreeBalance()}; a grant
     * that would add nothing writes no ledger row.
     *
     * @return amount actually granted (0 when already granted or the wallet is at the cap)
     */
    @Transactional
    public int grant(UUID userId, FitkenEntryType type, int amount, Bucket bucket,
                     String referenceType, UUID referenceId, String note) {
        if (amount <= 0) {
            return 0;
        }
        FitkenWallet wallet = lockWallet(userId);
        if (referenceId != null && ledgerRepository.existsByEntryTypeAndReferenceTypeAndReferenceId(
                type, referenceType, referenceId)) {
            return 0;
        }
        int granted = capFreeGrant(wallet, type, amount);
        if (granted <= 0) {
            return 0;
        }
        int subscriptionDelta = bucket == Bucket.SUBSCRIPTION ? granted : 0;
        int bonusDelta = bucket == Bucket.BONUS ? granted : 0;
        wallet.setSubscriptionRemaining(wallet.getSubscriptionRemaining() + subscriptionDelta);
        wallet.setBonusRemaining(wallet.getBonusRemaining() + bonusDelta);
        walletRepository.save(wallet);
        appendLedger(wallet, type, subscriptionDelta, bonusDelta, referenceType, referenceId, note);
        return granted;
    }

    /**
     * Takes back up to {@code amount} Fitken (bonus first) without letting the balance go negative.
     *
     * @return amount actually removed
     */
    @Transactional
    public int revoke(UUID userId, int amount, String referenceType, UUID referenceId, String note) {
        if (amount <= 0) {
            return 0;
        }
        FitkenWallet wallet = lockWallet(userId);
        int fromBonus = Math.min(amount, wallet.getBonusRemaining());
        int fromSubscription = Math.min(amount - fromBonus, wallet.getSubscriptionRemaining());
        if (fromBonus + fromSubscription == 0) {
            return 0;
        }
        wallet.setBonusRemaining(wallet.getBonusRemaining() - fromBonus);
        wallet.setSubscriptionRemaining(wallet.getSubscriptionRemaining() - fromSubscription);
        walletRepository.save(wallet);
        appendLedger(wallet, FitkenEntryType.ADMIN_ADJUST, -fromSubscription, -fromBonus,
                referenceType, referenceId, note);
        return fromBonus + fromSubscription;
    }

    @Transactional
    public FitkenWallet adminAdjust(UUID userId, int delta, String note) {
        if (delta == 0) {
            throw new BusinessException("Số Fitken điều chỉnh phải khác 0");
        }
        String safeNote = note != null && !note.isBlank() ? note.trim() : "Admin điều chỉnh Fitken";
        if (delta > 0) {
            grant(userId, FitkenEntryType.ADMIN_ADJUST, delta, Bucket.BONUS, REF_ADMIN, null, safeNote);
        } else {
            revoke(userId, -delta, REF_ADMIN, null, safeNote);
        }
        return lockWallet(userId);
    }

    /** Subscription expired: its unused Fitken are forfeited, bonus Fitken stay. */
    @Transactional
    public int resetSubscriptionBucket(UUID userId, UUID subscriptionId, String note) {
        FitkenWallet wallet = lockWallet(userId);
        int removed = wallet.getSubscriptionRemaining();
        if (removed <= 0) {
            return 0;
        }
        wallet.setSubscriptionRemaining(0);
        walletRepository.save(wallet);
        appendLedger(wallet, FitkenEntryType.EXPIRE_RESET, -removed, 0, REF_SUBSCRIPTION, subscriptionId, note);
        return removed;
    }

    public Page<FitkenLedgerEntry> ledger(UUID userId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        return ledgerRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(Math.max(page, 0), safeSize));
    }

    public List<FitkenLedgerEntry> recentLedger(UUID userId) {
        return ledgerRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId);
    }

    private void appendLedger(FitkenWallet wallet, FitkenEntryType type, int subscriptionDelta, int bonusDelta,
                              String referenceType, UUID referenceId, String note) {
        ledgerRepository.save(FitkenLedgerEntry.builder()
                .userId(wallet.getUserId())
                .entryType(type)
                .delta(subscriptionDelta + bonusDelta)
                .subscriptionDelta(subscriptionDelta)
                .bonusDelta(bonusDelta)
                .balanceAfter(wallet.balance())
                .referenceType(referenceType)
                .referenceId(referenceId)
                .note(note)
                .build());
    }
}
