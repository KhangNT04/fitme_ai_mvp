package com.fitme.preference.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.BrandMixMode;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.exception.PremiumRequiredException;
import com.fitme.entitlement.service.ConsumerEntitlementService;
import com.fitme.preference.dto.BrandPreferenceRequest;
import com.fitme.preference.dto.BrandPreferenceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Premium "Tùy biến phối đồ": favorite brands + brand mix mode applied to recommendations. */
@Service
@RequiredArgsConstructor
public class BrandPreferenceService {

    public static final int MAX_FAVORITE_BRANDS = 10;
    public static final String PREMIUM_MESSAGE = "Tùy biến phối đồ theo brand yêu thích là tính năng của FitMe Premium";

    /** Favorites + mode used for scoring; empty for Free users so their recommendations are unaffected. */
    public record ScoringPreference(Set<UUID> favoriteBrandIds, BrandMixMode mode) {
        public static final ScoringPreference NONE = new ScoringPreference(Set.of(), BrandMixMode.DIVERSE);
    }

    private final JdbcTemplate jdbc;
    private final UserAccountRepository userAccountRepository;
    private final BrandRepository brandRepository;
    private final ConsumerEntitlementService entitlementService;

    public BrandPreferenceResponse get(UUID userId) {
        UserAccount user = requireUser(userId);
        List<Brand> brands = approvedFavorites(userId);
        return new BrandPreferenceResponse(
                user.getBrandMixMode(),
                brands.stream().map(Brand::getId).toList(),
                brands.stream().map(b -> new BrandPreferenceResponse.BrandRef(b.getId(), b.getName(), b.getLogoUrl()))
                        .toList(),
                entitlementService.isPremium(userId));
    }

    @Transactional
    public BrandPreferenceResponse update(UUID userId, BrandPreferenceRequest request) {
        UserAccount user = requireUser(userId);
        if (!entitlementService.isPremium(userId)) {
            throw new PremiumRequiredException(PREMIUM_MESSAGE);
        }
        BrandMixMode mode = request != null && request.getMode() != null ? request.getMode() : null;
        if (mode == null) {
            throw new BusinessException("Vui lòng chọn chế độ phối đồ", "BRAND_PREFERENCE_INVALID");
        }
        Set<UUID> brandIds = new LinkedHashSet<>(request.getBrandIds() != null ? request.getBrandIds() : List.of());
        brandIds.remove(null);
        if (brandIds.size() > MAX_FAVORITE_BRANDS) {
            throw new BusinessException("Chỉ được chọn tối đa " + MAX_FAVORITE_BRANDS + " brand yêu thích",
                    "BRAND_PREFERENCE_INVALID");
        }
        if (mode == BrandMixMode.FAVORITES_ONLY && brandIds.isEmpty()) {
            throw new BusinessException("Chọn ít nhất 1 brand yêu thích để dùng chế độ chỉ brand yêu thích",
                    "BRAND_PREFERENCE_INVALID");
        }
        Map<UUID, Brand> found = brandRepository.findAllById(brandIds).stream()
                .collect(Collectors.toMap(Brand::getId, Function.identity()));
        for (UUID id : brandIds) {
            Brand brand = found.get(id);
            if (brand == null || brand.getStatus() != BrandStatus.APPROVED) {
                throw new BusinessException("Brand đã chọn không tồn tại hoặc chưa được duyệt",
                        "BRAND_PREFERENCE_INVALID");
            }
        }

        jdbc.update("DELETE FROM user_favorite_brands WHERE user_id = ?", userId);
        List<Object[]> rows = new ArrayList<>();
        for (UUID id : brandIds) {
            rows.add(new Object[]{userId, id});
        }
        if (!rows.isEmpty()) {
            jdbc.batchUpdate("INSERT INTO user_favorite_brands (user_id, brand_id) VALUES (?, ?)", rows);
        }
        user.setBrandMixMode(mode);
        userAccountRepository.save(user);
        return get(userId);
    }

    /** Favorites only count while the user is Premium; data is kept when Premium lapses. */
    public ScoringPreference forScoring(UUID userId) {
        if (userId == null || !entitlementService.isPremium(userId)) {
            return ScoringPreference.NONE;
        }
        UserAccount user = userAccountRepository.findById(userId).orElse(null);
        if (user == null) {
            return ScoringPreference.NONE;
        }
        Set<UUID> favorites = approvedFavorites(userId).stream()
                .map(Brand::getId)
                .collect(Collectors.toUnmodifiableSet());
        if (favorites.isEmpty()) {
            return ScoringPreference.NONE;
        }
        return new ScoringPreference(favorites, user.getBrandMixMode());
    }

    private List<Brand> approvedFavorites(UUID userId) {
        List<UUID> ids = jdbc.queryForList(
                "SELECT brand_id FROM user_favorite_brands WHERE user_id = ? ORDER BY created_at, brand_id",
                UUID.class, userId);
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<UUID, Brand> brands = brandRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Brand::getId, Function.identity()));
        return ids.stream()
                .map(brands::get)
                .filter(b -> b != null && b.getStatus() == BrandStatus.APPROVED)
                .toList();
    }

    private UserAccount requireUser(UUID userId) {
        return userAccountRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User không tồn tại"));
    }
}
