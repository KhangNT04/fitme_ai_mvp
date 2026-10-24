package com.fitme.userprofile.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.enums.FitkenEntryType;
import com.fitme.common.time.AppClock;
import com.fitme.community.repository.CommunityPostRepository;
import com.fitme.fitken.repository.FitkenLedgerRepository;
import com.fitme.fitken.repository.FitkenWalletRepository;
import com.fitme.gallery.repository.OutfitGalleryImageRepository;
import com.fitme.recommendation.repository.RecommendationRepository;
import com.fitme.rewards.repository.DailyCheckinRepository;
import com.fitme.tryon.repository.TryOnRequestRepository;
import com.fitme.userprofile.dto.ProfileSummaryDto;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.userprofile.repository.BodyProfileRepository;
import com.fitme.userprofile.repository.StyleProfileRepository;
import com.fitme.wardrobe.repository.WardrobeItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Builds the profile hub in a single round trip: completion checklist, counters and Fitken.
 *
 * <p>Read-only aggregation across modules (gallery, try-on, wardrobe, rewards, community); it
 * writes nothing, so it never changes another module's state.
 */
@Service
@RequiredArgsConstructor
public class ProfileSummaryService {

    /** Checklist steps shown in the profile progress card. */
    public static final List<String> COMPLETION_STEPS = List.of(
            "BODY_PROFILE", "MEASUREMENTS", "STYLE_PROFILE", "EMAIL_VERIFIED", "TWO_FACTOR");

    private final UserAccountRepository userAccountRepository;
    private final BodyProfileRepository bodyProfileRepository;
    private final StyleProfileRepository styleProfileRepository;
    private final OutfitGalleryImageRepository galleryRepository;
    private final TryOnRequestRepository tryOnRequestRepository;
    private final RecommendationRepository recommendationRepository;
    private final WardrobeItemRepository wardrobeRepository;
    private final DailyCheckinRepository checkinRepository;
    private final FitkenWalletRepository walletRepository;
    private final FitkenLedgerRepository ledgerRepository;
    private final CommunityPostRepository communityPostRepository;
    private final AppClock clock;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public ProfileSummaryDto summary(UUID userId) {
        UserAccount user = userAccountRepository.findById(userId).orElse(null);
        BodyProfile body = bodyProfileRepository.findFirstByUserIdOrderByUpdatedAtDesc(userId).orElse(null);
        StyleProfile style = styleProfileRepository.findFirstByUserIdOrderByUpdatedAtDesc(userId).orElse(null);

        boolean bodyProfileComplete = body != null;
        boolean measurementsComplete = body != null && body.getHeightCm() != null && body.getWeightKg() != null;
        boolean styleProfileComplete = style != null;
        boolean emailVerified = user != null && user.isEmailVerified();
        boolean twoFactorEnabled = user != null && user.isTotpEnabled();
        boolean brandPreferencesComplete = countFavoriteBrands(userId) > 0;

        // The checklist drives both the progress bar and the "next step" hint.
        Map<String, Boolean> checklist = new LinkedHashMap<>();
        checklist.put("BODY_PROFILE", bodyProfileComplete);
        checklist.put("MEASUREMENTS", measurementsComplete);
        checklist.put("STYLE_PROFILE", styleProfileComplete);
        checklist.put("EMAIL_VERIFIED", emailVerified);
        checklist.put("TWO_FACTOR", twoFactorEnabled);
        long completed = checklist.values().stream().filter(Boolean::booleanValue).count();
        double completionRatio = (double) completed / checklist.size();
        String nextStep = checklist.entrySet().stream()
                .filter(entry -> !entry.getValue())
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);

        int galleryImages = (int) galleryRepository.countByUserIdAndDeletedAtIsNull(userId);
        int savedTryOns = tryOnRequestRepository.findByUserIdAndSavedTrueOrderByUpdatedAtDesc(userId).size();
        int savedOutfits = recommendationRepository.findByUserIdAndSavedTrue(userId).size();
        int wardrobeItems = wardrobeRepository.findByUserId(userId).size();
        int communityPosts = (int) communityPostRepository.countByUserIdAndVisibility(userId, "PUBLIC");
        int communityFollowers = countFollowers(userId);
        int checkinStreak = currentStreak(userId);
        int fitkenBalance = walletRepository.findById(userId)
                .map(wallet -> wallet.balance())
                .orElse(0);
        int fitkenEarnedThisMonth = fitkenEarnedThisMonth(userId);

        return ProfileSummaryDto.builder()
                .completionRatio(Math.round(completionRatio * 100) / 100.0)
                .bodyProfileComplete(bodyProfileComplete)
                .measurementsComplete(measurementsComplete)
                .styleProfileComplete(styleProfileComplete)
                .brandPreferencesComplete(brandPreferencesComplete)
                .emailVerified(emailVerified)
                .twoFactorEnabled(twoFactorEnabled)
                .galleryImages(galleryImages)
                .savedOutfits(savedOutfits)
                .savedTryOns(savedTryOns)
                .wardrobeItems(wardrobeItems)
                .checkinStreak(checkinStreak)
                .fitkenBalance(fitkenBalance)
                .fitkenEarnedThisMonth(fitkenEarnedThisMonth)
                .communityPosts(communityPosts)
                .communityFollowers(communityFollowers)
                .nextStep(nextStep)
                .build();
    }

    private int countFavoriteBrands(UUID userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM user_favorite_brands WHERE user_id = ?", Integer.class, userId);
        return count == null ? 0 : count;
    }

    private int countFollowers(UUID userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM community_follows WHERE followed_id = ?", Integer.class, userId);
        return count == null ? 0 : count;
    }

    /** The streak stays alive today after a check-in and counts yesterday's streak otherwise. */
    private int currentStreak(UUID userId) {
        LocalDate today = clock.today();
        return checkinRepository.findByUserIdAndCheckinDate(userId, today)
                .map(checkin -> checkin.getStreak())
                .orElseGet(() -> checkinRepository.findByUserIdAndCheckinDate(userId, today.minusDays(1))
                        .map(checkin -> checkin.getStreak())
                        .orElse(0));
    }

    private int fitkenEarnedThisMonth(UUID userId) {
        LocalDate firstOfMonth = today().withDayOfMonth(1);
        return ledgerRepository.findByUserIdOrderByCreatedAtDesc(userId,
                        org.springframework.data.domain.PageRequest.of(0, 200)).stream()
                .filter(entry -> entry.getDelta() > 0)
                .filter(entry -> entry.getCreatedAt() != null
                        && !entry.getCreatedAt().isBefore(clock.startOfDay(firstOfMonth)))
                .mapToInt(entry -> entry.getDelta())
                .sum();
    }

    private LocalDate today() {
        return clock.today();
    }
}
