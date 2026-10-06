package com.fitme.rewards.service;

import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.FitkenEntryType;
import com.fitme.common.enums.ShareClaimStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import com.fitme.fitken.service.FitkenService;
import com.fitme.gallery.service.GalleryService;
import com.fitme.review.repository.ProductReviewRepository;
import com.fitme.review.service.ReviewService;
import com.fitme.rewards.dto.CheckinResultDto;
import com.fitme.rewards.dto.RewardsSummaryDto;
import com.fitme.rewards.dto.ShareClaimDto;
import com.fitme.rewards.dto.ShareClaimRequest;
import com.fitme.rewards.entity.DailyCheckin;
import com.fitme.rewards.entity.SocialShareClaim;
import com.fitme.rewards.repository.DailyCheckinRepository;
import com.fitme.rewards.repository.SocialShareClaimRepository;
import com.fitme.tryon.repository.TryOnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Check-in streak and social-share rewards. Calendar days use Asia/Ho_Chi_Minh. */
@Service
@RequiredArgsConstructor
public class RewardService {

    public static final String REF_CHECKIN = "DAILY_CHECKIN";
    public static final String REF_SHARE_CLAIM = "SHARE_CLAIM";
    private static final int RECENT_DAYS = 7;

    private final DailyCheckinRepository checkinRepository;
    private final SocialShareClaimRepository shareRepository;
    private final ProductReviewRepository reviewRepository;
    private final TryOnRequestRepository tryOnRequestRepository;
    private final GalleryService galleryService;
    private final FitkenService fitkenService;
    private final FitMeProperties properties;
    private final AppClock clock;

    @Transactional
    public RewardsSummaryDto summary(UUID userId) {
        int balance = fitkenService.balance(userId);
        LocalDate today = clock.today();
        int streakTarget = streakTarget();
        Optional<DailyCheckin> todayCheckin = checkinRepository.findByUserIdAndCheckinDate(userId, today);
        int aliveStreak = todayCheckin.map(DailyCheckin::getStreak)
                .orElseGet(() -> checkinRepository.findByUserIdAndCheckinDate(userId, today.minusDays(1))
                        .map(DailyCheckin::getStreak)
                        .orElse(0));
        List<LocalDate> recentDays = checkinRepository
                .findByUserIdAndCheckinDateGreaterThanEqualOrderByCheckinDateAsc(userId, today.minusDays(RECENT_DAYS - 1))
                .stream()
                .map(DailyCheckin::getCheckinDate)
                .toList();

        int dailyLimit = Math.max(0, properties.getFitken().getShareDailyLimit());
        long sharedToday = shareRepository.countByUserIdAndClaimDate(userId, today);
        int reviewDailyLimit = Math.max(0, properties.getFitken().getReviewDailyLimit());
        long reviewedToday = reviewRepository.countByUserIdAndRewardGrantedGreaterThanAndCreatedAtGreaterThanEqual(
                userId, 0, clock.startOfDay(today));

        return RewardsSummaryDto.builder()
                .balance(balance)
                .maxBalance(fitkenService.maxFreeBalance())
                .checkin(RewardsSummaryDto.CheckinStatus.builder()
                        .checkedInToday(todayCheckin.isPresent())
                        .currentStreak(aliveStreak)
                        .streakTarget(streakTarget)
                        .daysUntilNextReward(streakTarget - (aliveStreak % streakTarget))
                        .rewardAmount(properties.getFitken().getCheckinReward())
                        .recentDays(recentDays)
                        .build())
                .share(RewardsSummaryDto.ShareStatus.builder()
                        .rewardAmount(properties.getFitken().getShareReward())
                        .dailyLimit(dailyLimit)
                        .remainingToday((int) Math.max(0, dailyLimit - sharedToday))
                        .allowedDomains(ShareUrlPolicy.allowedDomains())
                        .recentClaims(listShares(userId))
                        .build())
                .review(RewardsSummaryDto.ReviewRewardStatus.builder()
                        .rewardAmount(properties.getFitken().getReviewReward())
                        .minContentLength(ReviewService.MIN_REWARD_CONTENT_LENGTH)
                        .rewardedCount(reviewRepository.countByUserIdAndRewardGrantedGreaterThan(userId, 0))
                        .dailyLimit(reviewDailyLimit)
                        .remainingToday((int) Math.max(0, reviewDailyLimit - reviewedToday))
                        .build())
                .build();
    }

    @Transactional
    public CheckinResultDto checkin(UUID userId) {
        // Locking the wallet serializes concurrent check-ins of the same user.
        fitkenService.lockWallet(userId);
        LocalDate today = clock.today();
        if (checkinRepository.findByUserIdAndCheckinDate(userId, today).isPresent()) {
            throw new BusinessException("Hôm nay bạn đã điểm danh rồi, quay lại vào ngày mai nhé!", "ALREADY_CHECKED_IN");
        }
        int streak = checkinRepository.findByUserIdAndCheckinDate(userId, today.minusDays(1))
                .map(previous -> previous.getStreak() + 1)
                .orElse(1);
        DailyCheckin checkin = checkinRepository.save(DailyCheckin.builder()
                .userId(userId)
                .checkinDate(today)
                .streak(streak)
                .rewardGranted(0)
                .build());

        int granted = 0;
        int intended = 0;
        if (streak % streakTarget() == 0) {
            intended = Math.max(0, properties.getFitken().getCheckinReward());
            granted = fitkenService.grant(userId, FitkenEntryType.CHECKIN_REWARD,
                    intended, FitkenService.Bucket.BONUS,
                    REF_CHECKIN, checkin.getId(), "Điểm danh " + streak + " ngày liên tiếp");
            checkin.setRewardGranted(granted);
            checkinRepository.save(checkin);
        }
        return CheckinResultDto.builder()
                .checkedInToday(true)
                .currentStreak(streak)
                .rewardGranted(granted)
                .rewardIntended(intended)
                .rewardCapped(granted < intended)
                .maxBalance(fitkenService.maxFreeBalance())
                .balance(fitkenService.balance(userId))
                .build();
    }

    @Transactional
    public ShareClaimDto submitShare(UUID userId, ShareClaimRequest request) {
        ShareUrlPolicy.SharePost post = ShareUrlPolicy.validate(request.getPostUrl());
        if (request.getGalleryImageId() != null && !galleryService.isOwnedBy(request.getGalleryImageId(), userId)) {
            throw new BusinessException("Ảnh trong thư viện không tồn tại", "SHARE_INVALID_URL");
        }
        if (request.getTryOnRequestId() != null && tryOnRequestRepository.findById(request.getTryOnRequestId())
                .map(tryOn -> !userId.equals(tryOn.getUserId()))
                .orElse(true)) {
            throw new BusinessException("Lượt thử đồ không thuộc tài khoản của bạn", "SHARE_INVALID_URL");
        }

        fitkenService.lockWallet(userId);
        if (shareRepository.existsByPostUrl(post.canonicalUrl())) {
            throw new BusinessException("Link bài đăng này đã được dùng để nhận thưởng", "SHARE_DUPLICATE");
        }
        LocalDate today = clock.today();
        int dailyLimit = Math.max(0, properties.getFitken().getShareDailyLimit());
        if (shareRepository.countByUserIdAndClaimDate(userId, today) >= dailyLimit) {
            throw new BusinessException("Bạn đã nhận thưởng chia sẻ hôm nay, hãy quay lại vào ngày mai", "SHARE_DAILY_LIMIT");
        }

        SocialShareClaim claim;
        try {
            // The wallet lock only serializes one user; two users racing on the same URL hit the unique index.
            claim = shareRepository.saveAndFlush(SocialShareClaim.builder()
                    .userId(userId)
                    .postUrl(post.canonicalUrl())
                    .platform(post.platform())
                    .status(ShareClaimStatus.APPROVED)
                    .rewardGranted(0)
                    .tryOnRequestId(request.getTryOnRequestId())
                    .galleryImageId(request.getGalleryImageId())
                    .claimDate(today)
                    .build());
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException("Link bài đăng này đã được dùng để nhận thưởng", "SHARE_DUPLICATE");
        }
        int intended = Math.max(0, properties.getFitken().getShareReward());
        int granted = fitkenService.grant(userId, FitkenEntryType.SHARE_REWARD,
                intended, FitkenService.Bucket.BONUS,
                REF_SHARE_CLAIM, claim.getId(), "Chia sẻ bài đăng " + post.platform());
        // Only what was actually credited is stored, so an admin reject never revokes more than that.
        claim.setRewardGranted(granted);
        ShareClaimDto dto = ShareClaimDto.from(shareRepository.save(claim));
        dto.setRewardIntended(intended);
        dto.setRewardCapped(granted < intended);
        dto.setMaxBalance(fitkenService.maxFreeBalance());
        return dto;
    }

    public List<ShareClaimDto> listShares(UUID userId) {
        return shareRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(ShareClaimDto::from)
                .toList();
    }

    public List<ShareClaimDto> adminListShares(ShareClaimStatus status) {
        List<SocialShareClaim> claims = status != null
                ? shareRepository.findTop100ByStatusOrderByCreatedAtDesc(status)
                : shareRepository.findTop100ByOrderByCreatedAtDesc();
        return claims.stream().map(ShareClaimDto::from).toList();
    }

    @Transactional
    public ShareClaimDto adminReject(UUID claimId, String note) {
        SocialShareClaim claim = shareRepository.findById(claimId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lượt chia sẻ"));
        if (claim.getStatus() == ShareClaimStatus.REJECTED) {
            return ShareClaimDto.from(claim);
        }
        String safeNote = note != null && !note.isBlank() ? note.trim() : "Bài đăng không hợp lệ";
        claim.setStatus(ShareClaimStatus.REJECTED);
        claim.setAdminNote(safeNote);
        claim.setReviewedAt(clock.now());
        if (claim.getRewardGranted() > 0) {
            fitkenService.revoke(claim.getUserId(), claim.getRewardGranted(), REF_SHARE_CLAIM, claim.getId(),
                    "Thu hồi thưởng chia sẻ: " + safeNote);
        }
        return ShareClaimDto.from(shareRepository.save(claim));
    }

    private int streakTarget() {
        return Math.max(1, properties.getFitken().getCheckinStreakDays());
    }
}
