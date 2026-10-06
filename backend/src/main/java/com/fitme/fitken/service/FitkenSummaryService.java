package com.fitme.fitken.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.billing.service.ConsumerSubscriptionService;
import com.fitme.common.dto.PageResult;
import com.fitme.common.exception.NotFoundException;
import com.fitme.fitken.dto.AdminFitkenDetailDto;
import com.fitme.fitken.dto.FitkenLedgerItemDto;
import com.fitme.fitken.dto.FitkenWalletResponse;
import com.fitme.fitken.entity.FitkenWallet;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FitkenSummaryService {

    private final FitkenService fitkenService;
    private final ConsumerSubscriptionService subscriptionService;
    private final UserAccountRepository userAccountRepository;

    @Transactional
    public FitkenWalletResponse wallet(UUID userId) {
        return toResponse(userId, fitkenService.getWallet(userId));
    }

    private FitkenWalletResponse toResponse(UUID userId, FitkenWallet wallet) {
        return FitkenWalletResponse.builder()
                .balance(wallet.balance())
                .subscriptionRemaining(wallet.getSubscriptionRemaining())
                .bonusRemaining(wallet.getBonusRemaining())
                .trialGranted(wallet.getTrialGrantedAt() != null)
                .tryOnCost(fitkenService.tryOnCost())
                .maxBalance(fitkenService.maxFreeBalance())
                .plan(subscriptionService.resolvePlan(userId))
                .subscription(subscriptionService.describe(userId))
                .build();
    }

    public PageResult<FitkenLedgerItemDto> ledger(UUID userId, int page, int size) {
        return PageResult.of(fitkenService.ledger(userId, page, size), FitkenLedgerItemDto::from);
    }

    @Transactional
    public AdminFitkenDetailDto adminDetail(UUID userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User không tồn tại"));
        FitkenWallet existing = fitkenService.findWallet(userId)
                .orElseGet(() -> FitkenWallet.builder().userId(userId).build());
        FitkenWalletResponse wallet = toResponse(userId, existing);
        return AdminFitkenDetailDto.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .wallet(wallet)
                .ledger(fitkenService.recentLedger(userId).stream().map(FitkenLedgerItemDto::from).toList())
                .build();
    }

    @Transactional
    public AdminFitkenDetailDto adminAdjust(UUID userId, int delta, String note) {
        userAccountRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User không tồn tại"));
        fitkenService.adminAdjust(userId, delta, note);
        return adminDetail(userId);
    }
}
