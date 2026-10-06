package com.fitme.review.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.FitkenEntryType;
import com.fitme.common.enums.ReviewStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import com.fitme.fitken.service.FitkenService;
import com.fitme.product.repository.ProductRepository;
import com.fitme.review.dto.*;
import com.fitme.review.entity.ProductReview;
import com.fitme.review.entity.ProductReviewImage;
import com.fitme.review.repository.ProductReviewImageRepository;
import com.fitme.review.repository.ProductReviewRepository;
import com.fitme.storage.ImageUploadValidator;
import com.fitme.storage.StorageService;
import com.fitme.storage.StoredMediaPaths;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    public static final int MIN_REWARD_CONTENT_LENGTH = 20;
    public static final String REF_REVIEW = "PRODUCT_REVIEW";
    private static final String MEDIA_FOLDER = "reviews";
    private static final String MEDIA_PREFIX = "/uploads/" + MEDIA_FOLDER + "/";

    private final ProductReviewRepository reviewRepository;
    private final ProductReviewImageRepository imageRepository;
    private final ProductRepository productRepository;
    private final UserAccountRepository userAccountRepository;
    private final FitkenService fitkenService;
    private final PurchaseVerifier purchaseVerifier;
    private final StorageService storageService;
    private final FitMeProperties properties;
    private final AppClock clock;
    private final JdbcTemplate jdbcTemplate;

    public ProductReviewsResponse listForProduct(UUID productId, int page, int size, UUID viewerId) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        Page<ProductReview> reviews = reviewRepository.findByProductIdAndStatusOrderByCreatedAtDesc(
                productId, ReviewStatus.VISIBLE, PageRequest.of(Math.max(page, 0), safeSize));
        Double average = reviewRepository.averageRating(productId, ReviewStatus.VISIBLE);
        Set<UUID> buyers = reviews.isEmpty() ? Set.of() : purchaseVerifier.confirmedBuyers(productId);
        return ProductReviewsResponse.builder()
                .averageRating(average == null ? 0
                        : BigDecimal.valueOf(average).setScale(1, RoundingMode.HALF_UP).doubleValue())
                .totalCount(reviews.getTotalElements())
                .page(reviews.getNumber())
                .size(reviews.getSize())
                .items(toDtos(reviews.getContent(), buyers, viewerId, votedBy(viewerId, reviews.getContent())))
                .build();
    }

    @Transactional
    public HelpfulVoteResponse voteHelpful(UUID userId, UUID reviewId, boolean helpful) {
        ProductReview review = reviewRepository.findById(reviewId)
                .filter(r -> r.getStatus() == ReviewStatus.VISIBLE)
                .orElseThrow(() -> new NotFoundException("Đánh giá không tồn tại"));
        if (review.getUserId().equals(userId)) {
            throw new BusinessException("Bạn không thể bình chọn cho đánh giá của chính mình");
        }
        if (helpful) {
            int inserted = jdbcTemplate.update(
                    "INSERT INTO review_helpful_votes (review_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    reviewId, userId);
            if (inserted > 0) {
                jdbcTemplate.update("UPDATE product_reviews SET helpful_count = helpful_count + 1 WHERE id = ?",
                        reviewId);
            }
        } else {
            int deleted = jdbcTemplate.update(
                    "DELETE FROM review_helpful_votes WHERE review_id = ? AND user_id = ?", reviewId, userId);
            if (deleted > 0) {
                jdbcTemplate.update("UPDATE product_reviews SET helpful_count = GREATEST(helpful_count - 1, 0) "
                        + "WHERE id = ?", reviewId);
            }
        }
        Integer count = jdbcTemplate.queryForObject(
                "SELECT helpful_count FROM product_reviews WHERE id = ?", Integer.class, reviewId);
        return new HelpfulVoteResponse(reviewId, count == null ? 0 : count, helpful);
    }

    /** Recent well-rated visible reviews with real content, for social proof on the landing page. */
    public List<FeaturedReviewDto> featured(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 12);
        return jdbcTemplate.query("""
                SELECT r.id, r.product_id, p.name AS product_name, r.rating, r.content, r.helpful_count, r.created_at,
                       COALESCE(NULLIF(TRIM(u.display_name), ''), 'Khách hàng FitMe') AS author_name,
                       (SELECT i.image_url FROM product_review_images i WHERE i.review_id = r.id
                        ORDER BY i.sort_order LIMIT 1) AS image_url,
                       EXISTS (SELECT 1 FROM buy_click_events b
                               WHERE b.product_id = r.product_id AND b.user_id = r.user_id
                                 AND b.purchased_confirmed = TRUE) AS verified
                FROM product_reviews r
                JOIN products p ON p.id = r.product_id
                JOIN user_accounts u ON u.id = r.user_id
                WHERE r.status = 'VISIBLE' AND r.rating >= 4 AND LENGTH(r.content) >= ?
                ORDER BY r.helpful_count DESC, r.created_at DESC
                LIMIT ?
                """, (rs, i) -> new FeaturedReviewDto(
                rs.getObject("id", UUID.class),
                rs.getObject("product_id", UUID.class),
                rs.getString("product_name"),
                rs.getInt("rating"),
                rs.getString("content"),
                rs.getString("author_name"),
                rs.getString("image_url"),
                rs.getBoolean("verified"),
                rs.getInt("helpful_count"),
                rs.getTimestamp("created_at").toLocalDateTime().toInstant(ZoneOffset.UTC)),
                MIN_REWARD_CONTENT_LENGTH, safeLimit);
    }

    private Set<UUID> votedBy(UUID viewerId, List<ProductReview> reviews) {
        if (viewerId == null || reviews.isEmpty()) {
            return Set.of();
        }
        List<UUID> ids = reviews.stream().map(ProductReview::getId).toList();
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        List<Object> args = new ArrayList<>(ids);
        args.addFirst(viewerId);
        return new HashSet<>(jdbcTemplate.queryForList(
                "SELECT review_id FROM review_helpful_votes WHERE user_id = ? AND review_id IN (" + placeholders + ")",
                UUID.class, args.toArray()));
    }

    @Transactional
    public CreateReviewResponse create(UUID userId, UUID productId, CreateReviewRequest request) {
        if (!productRepository.existsById(productId)) {
            throw new NotFoundException("Sản phẩm không tồn tại");
        }
        if (reviewRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new BusinessException("Bạn đã đánh giá sản phẩm này rồi", "REVIEW_EXISTS");
        }
        List<String> imagePaths = normalizeImages(userId, request.getImageUrls());
        String content = request.getContent().trim();

        ProductReview review = reviewRepository.save(ProductReview.builder()
                .productId(productId)
                .userId(userId)
                .rating(request.getRating().shortValue())
                .content(content)
                .status(ReviewStatus.VISIBLE)
                .rewardGranted(0)
                .build());
        for (int i = 0; i < imagePaths.size(); i++) {
            imageRepository.save(ProductReviewImage.builder()
                    .reviewId(review.getId())
                    .imageUrl(imagePaths.get(i))
                    .sortOrder(i)
                    .build());
        }

        int granted = 0;
        int intended = 0;
        boolean limitReached = false;
        if (!imagePaths.isEmpty() && content.length() >= MIN_REWARD_CONTENT_LENGTH) {
            // Locking the wallet serializes concurrent reviews of the same user against the daily limit.
            fitkenService.lockWallet(userId);
            if (rewardedReviewsToday(userId) >= reviewDailyLimit()) {
                limitReached = true;
            } else {
                intended = Math.max(0, properties.getFitken().getReviewReward());
                granted = fitkenService.grant(userId, FitkenEntryType.REVIEW_REWARD,
                        intended, FitkenService.Bucket.BONUS,
                        REF_REVIEW, review.getId(), "Đánh giá sản phẩm có ảnh");
                review.setRewardGranted(granted);
                review = reviewRepository.save(review);
            }
        }
        Set<UUID> buyers = purchaseVerifier.hasConfirmedPurchase(userId, productId) ? Set.of(userId) : Set.of();
        return CreateReviewResponse.builder()
                .review(toDtos(List.of(review), buyers).getFirst())
                .rewardGranted(granted)
                .rewardIntended(intended)
                .rewardCapped(granted < intended)
                .maxBalance(fitkenService.maxFreeBalance())
                .rewardLimitReached(limitReached)
                .build();
    }

    /** Rewarded reviews the user posted since the start of today (Asia/Ho_Chi_Minh). */
    public long rewardedReviewsToday(UUID userId) {
        return reviewRepository.countByUserIdAndRewardGrantedGreaterThanAndCreatedAtGreaterThanEqual(
                userId, 0, clock.startOfDay(clock.today()));
    }

    public int reviewDailyLimit() {
        return Math.max(0, properties.getFitken().getReviewDailyLimit());
    }

    public ReviewImageUploadResponse uploadImage(UUID userId, MultipartFile file) throws IOException {
        ImageUploadValidator.validate(file);
        String path = storageService.store(MEDIA_FOLDER, userId + "-" + UUID.randomUUID(), file);
        return ReviewImageUploadResponse.builder().url(path).build();
    }

    public List<ReviewItemDto> adminList(ReviewStatus status) {
        List<ProductReview> reviews = status != null
                ? reviewRepository.findTop100ByStatusOrderByCreatedAtDesc(status)
                : reviewRepository.findTop100ByOrderByCreatedAtDesc();
        return toDtos(reviews, Set.of());
    }

    @Transactional
    public ReviewItemDto adminHide(UUID reviewId, HideReviewRequest request) {
        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Đánh giá không tồn tại"));
        if (review.getStatus() != ReviewStatus.HIDDEN) {
            review.setStatus(ReviewStatus.HIDDEN);
            review.setHiddenAt(clock.now());
        }
        if (request != null && request.isRevokeReward() && review.getRewardGranted() > 0) {
            String note = request.getNote() != null && !request.getNote().isBlank()
                    ? request.getNote().trim()
                    : "Đánh giá vi phạm quy định";
            fitkenService.revoke(review.getUserId(), review.getRewardGranted(), REF_REVIEW, review.getId(),
                    "Thu hồi thưởng đánh giá: " + note);
            review.setRewardGranted(0);
        }
        return toDtos(List.of(reviewRepository.save(review)), Set.of()).getFirst();
    }

    /**
     * Only images this user uploaded through {@code /api/v1/reviews/images} are accepted (upload names are
     * prefixed with the uploader id), so the reward cannot be farmed with external or borrowed links.
     */
    private List<String> normalizeImages(UUID userId, List<String> raw) {
        String ownPrefix = MEDIA_PREFIX + userId + "-";
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        if (raw.size() > 5) {
            throw new BusinessException("Tối đa 5 ảnh cho mỗi đánh giá");
        }
        List<String> paths = new ArrayList<>();
        for (String url : raw) {
            if (url == null || url.isBlank()) {
                continue;
            }
            String path = StoredMediaPaths.normalizeToUploadPath(url.trim());
            if (path == null || !path.startsWith(ownPrefix) || path.contains("..")) {
                throw new BusinessException("Ảnh đánh giá không hợp lệ, vui lòng tải ảnh lên lại");
            }
            if (!paths.contains(path)) {
                paths.add(path);
            }
        }
        return paths;
    }

    private List<ReviewItemDto> toDtos(List<ProductReview> reviews, Set<UUID> verifiedBuyers) {
        return toDtos(reviews, verifiedBuyers, null, Set.of());
    }

    private List<ReviewItemDto> toDtos(List<ProductReview> reviews, Set<UUID> verifiedBuyers, UUID viewerId,
                                       Set<UUID> votedByViewer) {
        if (reviews.isEmpty()) {
            return List.of();
        }
        List<UUID> reviewIds = reviews.stream().map(ProductReview::getId).toList();
        Map<UUID, List<String>> imagesByReview = imageRepository.findByReviewIdInOrderBySortOrderAsc(reviewIds).stream()
                .collect(Collectors.groupingBy(ProductReviewImage::getReviewId, LinkedHashMap::new,
                        Collectors.mapping(ProductReviewImage::getImageUrl, Collectors.toList())));
        Map<UUID, String> authors = userAccountRepository.findAllById(
                        reviews.stream().map(ProductReview::getUserId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(UserAccount::getId, ReviewService::authorName));
        return reviews.stream()
                .map(review -> ReviewItemDto.builder()
                        .id(review.getId())
                        .productId(review.getProductId())
                        .rating(review.getRating())
                        .content(review.getContent())
                        .imageUrls(imagesByReview.getOrDefault(review.getId(), List.of()))
                        .authorName(authors.getOrDefault(review.getUserId(), "Khách hàng FitMe"))
                        .verifiedPurchase(verifiedBuyers.contains(review.getUserId()))
                        .status(review.getStatus())
                        .rewardGranted(review.getRewardGranted())
                        .helpfulCount(review.getHelpfulCount())
                        .helpfulByMe(votedByViewer.contains(review.getId()))
                        .mine(review.getUserId().equals(viewerId))
                        .createdAt(review.getCreatedAt())
                        .build())
                .toList();
    }

    private static String authorName(UserAccount user) {
        String name = user.getDisplayName();
        return name != null && !name.isBlank() ? name.trim() : "Khách hàng FitMe";
    }
}
