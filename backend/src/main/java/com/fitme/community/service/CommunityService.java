package com.fitme.community.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.dto.PageResult;
import com.fitme.common.enums.ConsentType;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import com.fitme.community.dto.*;
import com.fitme.community.entity.CommunityPost;
import com.fitme.community.repository.CommunityPostRepository;
import com.fitme.gallery.entity.OutfitGalleryImage;
import com.fitme.gallery.repository.OutfitGalleryImageRepository;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.privacy.repository.ConsentRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Community posts: outfits the user chose to publish publicly.
 *
 * <p>Module boundaries: this package only reads from {@code gallery}, {@code product} and
 * {@code brand}; nothing in those modules calls back into {@code community}. The like/save/follow
 * tables are maintained with plain SQL so entity saves never overwrite concurrent counters.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityService {

    public static final String VISIBILITY_PUBLIC = "PUBLIC";
    public static final String VISIBILITY_HIDDEN = "HIDDEN";
    public static final String VISIBILITY_REMOVED = "REMOVED";
    private static final int MAX_CAPTION_LENGTH = 2000;
    private static final int MAX_TITLE_LENGTH = 200;
    private static final String SHARE_CODE_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CommunityPostRepository postRepository;
    private final OutfitGalleryImageRepository galleryRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final BrandRepository brandRepository;
    private final UserAccountRepository userAccountRepository;
    private final ConsentRecordRepository consentRepository;
    private final AnalyticsService analyticsService;
    private final FitMeProperties properties;
    private final AppClock clock;
    private final JdbcTemplate jdbcTemplate;

    // ── Feed ──────────────────────────────────────────────────────────────────────────────────

    public PageResult<CommunityPostDto> feed(UUID viewerId, int page, int size, String brandId, String styleLabel,
                                             String sort) {
        int safeSize = Math.min(Math.max(size, 1), 48);
        PageRequest pageable = PageRequest.of(Math.max(page, 0), safeSize);
        boolean popular = "popular".equalsIgnoreCase(sort);
        Page<CommunityPost> posts;
        if (brandId != null && !brandId.isBlank()) {
            posts = postRepository.findFeedByBrand(brandId, pageable);
        } else if (styleLabel != null && !styleLabel.isBlank()) {
            posts = postRepository.findFeedByStyle(styleLabel, pageable);
        } else if (popular) {
            posts = postRepository.findByVisibilityOrderByLikeCountDescCreatedAtDesc(VISIBILITY_PUBLIC, pageable);
        } else {
            posts = postRepository.findByVisibilityOrderByCreatedAtDesc(VISIBILITY_PUBLIC, pageable);
        }
        return PageResult.of(posts, post -> toDto(post, viewerId));
    }

    public CommunityPostDto byShareCode(String shareCode, UUID viewerId) {
        CommunityPost post = postRepository.findByShareCodeAndVisibility(shareCode, VISIBILITY_PUBLIC)
                .orElseThrow(() -> new NotFoundException("Outfit này không còn được chia sẻ công khai"));
        registerView(post, viewerId);
        return toDto(post, viewerId);
    }

    public CommunityPostDto byId(UUID id, UUID viewerId) {
        CommunityPost post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Bài đăng không tồn tại"));
        return toDto(post, viewerId);
    }

    public PageResult<CommunityPostDto> listByAuthor(UUID authorId, UUID viewerId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 48);
        return PageResult.of(
                postRepository.findByUserIdAndVisibilityOrderByCreatedAtDesc(authorId, VISIBILITY_PUBLIC,
                        PageRequest.of(Math.max(page, 0), safeSize)),
                post -> toDto(post, viewerId));
    }

    public PageResult<CommunityPostDto> listSaved(UUID userId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 48);
        List<UUID> ids = jdbcTemplate.queryForList(
                "SELECT post_id FROM community_post_saves WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                UUID.class, userId, safeSize, Math.max(page, 0) * safeSize);
        List<CommunityPost> posts = ids.isEmpty()
                ? List.of()
                : postRepository.findAllById(ids).stream()
                        .filter(p -> VISIBILITY_PUBLIC.equals(p.getVisibility()))
                        .toList();
        Map<UUID, CommunityPost> byId = posts.stream()
                .collect(Collectors.toMap(CommunityPost::getId, p -> p));
        List<CommunityPost> ordered = ids.stream().map(byId::get).filter(Objects::nonNull).toList();
        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM community_post_saves s JOIN community_posts p ON p.id = s.post_id "
                        + "WHERE s.user_id = ? AND p.visibility = 'PUBLIC'",
                Long.class, userId);
        return new PageResult<>(ordered.stream().map(post -> toDto(post, userId)).toList(),
                Math.max(page, 0), safeSize, total == null ? 0L : total);
    }

    // ── Publishing ─────────────────────────────────────────────────────────────────────────────

    @Transactional
    public CreateCommunityPostResult create(UUID userId, CreateCommunityPostRequest request) {
        if (!hasCommunityShareConsent(userId)) {
            throw new BusinessException(
                    "Bạn cần đồng ý chia sẻ ảnh công khai trước khi đăng. Mở Quyền riêng tư để bật.",
                    "CONSENT_REQUIRED");
        }
        OutfitGalleryImage image = resolveSourceImage(userId, request);
        if (image == null) {
            throw new BusinessException("Ảnh không tồn tại trong thư viện của bạn", "COMMUNITY_IMAGE_NOT_FOUND");
        }
        int dailyLimit = Math.max(0, properties.getCommunity().getPostDailyLimit());
        if (dailyLimit > 0 && postsToday(userId) >= dailyLimit) {
            throw new BusinessException(
                    "Bạn đã đăng " + dailyLimit + " outfit hôm nay. Hãy quay lại vào ngày mai nhé!",
                    "COMMUNITY_DAILY_LIMIT");
        }

        List<UUID> productIds = parseIds(image.getProductIds());
        List<Product> products = productIds.isEmpty()
                ? List.of()
                : productRepository.findAllById(productIds);
        String brandIds = products.stream()
                .map(Product::getBrandId)
                .distinct()
                .map(UUID::toString)
                .collect(Collectors.joining(","));
        String wrappedBrandIds = brandIds.isEmpty() ? null : "," + brandIds + ",";

        CommunityPost post = postRepository.save(CommunityPost.builder()
                .userId(userId)
                .galleryImageId(image.getId())
                .tryOnRequestId(image.getTryOnRequestId())
                .shareCode(generateShareCode())
                .title(trimTo(request.getTitle(), MAX_TITLE_LENGTH))
                .caption(trimTo(request.getCaption(), MAX_CAPTION_LENGTH))
                .brandIds(wrappedBrandIds)
                .productIds(productIds.isEmpty() ? null : productIds.stream()
                        .map(UUID::toString).collect(Collectors.joining(",")))
                .imageUrl(image.getImageUrl())
                .visibility(VISIBILITY_PUBLIC)
                .build());

        analyticsService.track("COMMUNITY_POST_CREATED", userId, null, null, null, null,
                post.getTryOnRequestId(), Map.of("postId", post.getId().toString()));

        return CreateCommunityPostResult.builder()
                .post(toDto(post, userId))
                .shareUrl(shareUrl(post.getShareCode()))
                .build();
    }

    @Transactional
    public void delete(UUID userId, UUID postId) {
        CommunityPost post = postRepository.findByIdAndUserId(postId, userId)
                .orElseThrow(() -> new NotFoundException("Bài đăng không tồn tại"));
        post.setVisibility(VISIBILITY_REMOVED);
        post.setHiddenAt(clock.now());
        postRepository.save(post);
    }

    /** Admin moderation: hides a post that breaks the rules. */
    @Transactional
    public void adminHide(UUID postId) {
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Bài đăng không tồn tại"));
        if (!VISIBILITY_HIDDEN.equals(post.getVisibility())) {
            post.setVisibility(VISIBILITY_HIDDEN);
            post.setHiddenAt(clock.now());
            postRepository.save(post);
        }
    }

    // ── Interactions ───────────────────────────────────────────────────────────────────────────

    @Transactional
    public CommunityPostInteractionDto toggleLike(UUID userId, UUID postId, boolean liked) {
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Bài đăng không tồn tại"));
        if (post.getUserId().equals(userId)) {
            throw new BusinessException("Bạn không thể thích bài đăng của chính mình");
        }
        if (liked) {
            int inserted = jdbcTemplate.update(
                    "INSERT INTO community_post_likes (post_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    postId, userId);
            if (inserted > 0) {
                jdbcTemplate.update("UPDATE community_posts SET like_count = like_count + 1 WHERE id = ?", postId);
            }
        } else {
            int deleted = jdbcTemplate.update(
                    "DELETE FROM community_post_likes WHERE post_id = ? AND user_id = ?", postId, userId);
            if (deleted > 0) {
                jdbcTemplate.update("UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?",
                        postId);
            }
        }
        Integer count = jdbcTemplate.queryForObject(
                "SELECT like_count FROM community_posts WHERE id = ?", Integer.class, postId);
        return CommunityPostInteractionDto.builder()
                .postId(postId)
                .likeCount(count == null ? 0 : count)
                .commentCount(commentCount(postId))
                .likedByMe(liked)
                .savedByMe(isSaved(userId, postId))
                .build();
    }

    @Transactional
    public CommunityPostInteractionDto toggleSave(UUID userId, UUID postId, boolean saved) {
        postRepository.findById(postId).orElseThrow(() -> new NotFoundException("Bài đăng không tồn tại"));
        if (saved) {
            jdbcTemplate.update(
                    "INSERT INTO community_post_saves (post_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    postId, userId);
        } else {
            jdbcTemplate.update("DELETE FROM community_post_saves WHERE post_id = ? AND user_id = ?", postId, userId);
        }
        Integer count = jdbcTemplate.queryForObject(
                "SELECT like_count FROM community_posts WHERE id = ?", Integer.class, postId);
        return CommunityPostInteractionDto.builder()
                .postId(postId)
                .likeCount(count == null ? 0 : count)
                .commentCount(commentCount(postId))
                .likedByMe(hasLiked(userId, postId))
                .savedByMe(saved)
                .build();
    }

    @Transactional
    public boolean follow(UUID userId, UUID followedId) {
        if (userId.equals(followedId)) {
            throw new BusinessException("Bạn không thể theo dõi chính mình");
        }
        if (!userAccountRepository.existsById(followedId)) {
            throw new NotFoundException("Người dùng không tồn tại");
        }
        jdbcTemplate.update(
                "INSERT INTO community_follows (follower_id, followed_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                userId, followedId);
        return true;
    }

    @Transactional
    public boolean unfollow(UUID userId, UUID followedId) {
        jdbcTemplate.update("DELETE FROM community_follows WHERE follower_id = ? AND followed_id = ?",
                userId, followedId);
        return false;
    }

    public boolean isFollowing(UUID followerId, UUID followedId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM community_follows WHERE follower_id = ? AND followed_id = ?",
                Integer.class, followerId, followedId);
        return count != null && count > 0;
    }

    // ── Profile & stats ────────────────────────────────────────────────────────────────────────

    public CommunityProfileDto profile(UUID userId) {
        return CommunityProfileDto.builder()
                .publishedPosts((int) postRepository.countByUserIdAndVisibility(userId, VISIBILITY_PUBLIC))
                .savedPosts(countSaved(userId))
                .followers(countFollowers(userId))
                .following(countFollowing(userId))
                .totalLikesReceived(totalLikesReceived(userId))
                .build();
    }

    public CommunityStatsDto stats() {
        return CommunityStatsDto.builder()
                .totalPosts(postRepository.countByVisibility(VISIBILITY_PUBLIC))
                .postsLast7Days(postRepository.countByVisibilityAndCreatedAtAfter(VISIBILITY_PUBLIC,
                        clock.now().minus(7, ChronoUnit.DAYS)))
                .authorsWithPosts(postRepository.countDistinctAuthors())
                .totalLikes(sumLikeCount())
                .totalViews(sumViewCount())
                .build();
    }

    // ── Privacy ────────────────────────────────────────────────────────────────────────────────

    /** Removes the user's community footprint; called by the personal-data eraser. */
    @Transactional
    public int purgeForUser(UUID userId) {
        List<CommunityPost> posts = postRepository.findByUserId(userId);
        jdbcTemplate.update("DELETE FROM community_post_saves WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM community_post_likes WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM community_follows WHERE follower_id = ? OR followed_id = ?",
                userId, userId);
        // Comments live in their own table with a cascade from the post, so they need an explicit delete.
        jdbcTemplate.update("DELETE FROM community_comments WHERE user_id = ?", userId);
        jdbcTemplate.update("DELETE FROM community_comment_notifications WHERE recipient_id = ? OR actor_id = ?",
                userId, userId);
        postRepository.deleteAll(posts);
        return posts.size();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────────────────────

    /** The most recent decision wins, so withdrawing consent also blocks publishing. */
    private boolean hasCommunityShareConsent(UUID userId) {
        if (userId == null) {
            return false;
        }
        return consentRepository
                .findFirstByUserIdAndConsentTypeOrderByCreatedAtDesc(userId, ConsentType.COMMUNITY_SHARE)
                .map(record -> record.isAccepted())
                .orElse(false);
    }

    private OutfitGalleryImage resolveSourceImage(UUID userId, CreateCommunityPostRequest request) {        if (request.getGalleryImageId() != null) {
            return galleryRepository.findByIdAndUserIdAndDeletedAtIsNull(request.getGalleryImageId(), userId)
                    .orElse(null);
        }
        return null;
    }

    /** A gallery image the user owns, or the newest one produced by the given try-on. */
    public OutfitGalleryImage resolveImageForTryOn(UUID userId, UUID tryOnRequestId) {
        if (tryOnRequestId == null) {
            return null;
        }
        return galleryRepository.findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(userId,
                        PageRequest.of(0, 50)).getContent().stream()
                .filter(image -> tryOnRequestId.equals(image.getTryOnRequestId()))
                .findFirst()
                .orElse(null);
    }

    private long postsToday(UUID userId) {
        return postRepository.countByUserIdAndCreatedAtAfter(userId, clock.startOfDay(clock.today()));
    }

    private void registerView(CommunityPost post, UUID viewerId) {
        if (viewerId != null && viewerId.equals(post.getUserId())) {
            return;
        }
        jdbcTemplate.update("UPDATE community_posts SET view_count = view_count + 1 WHERE id = ?", post.getId());
        analyticsService.track("COMMUNITY_POST_VIEWED", viewerId, null, null, null, null,
                post.getTryOnRequestId(), Map.of("postId", post.getId().toString()));
    }

    private boolean hasLiked(UUID userId, UUID postId) {
        if (userId == null) {
            return false;
        }
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM community_post_likes WHERE post_id = ? AND user_id = ?",
                Integer.class, postId, userId);
        return count != null && count > 0;
    }

    private boolean isSaved(UUID userId, UUID postId) {
        if (userId == null) {
            return false;
        }
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM community_post_saves WHERE post_id = ? AND user_id = ?",
                Integer.class, postId, userId);
        return count != null && count > 0;
    }

    /** Current comment count, maintained by the database trigger. */
    private int commentCount(UUID postId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT comment_count FROM community_posts WHERE id = ?", Integer.class, postId);
        return count == null ? 0 : count;
    }

    private int countSaved(UUID userId) {        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM community_post_saves WHERE user_id = ?", Integer.class, userId);
        return count == null ? 0 : count;
    }

    private int countFollowers(UUID userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM community_follows WHERE followed_id = ?", Integer.class, userId);
        return count == null ? 0 : count;
    }

    private int countFollowing(UUID userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM community_follows WHERE follower_id = ?", Integer.class, userId);
        return count == null ? 0 : count;
    }

    private int totalLikesReceived(UUID userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(like_count), 0) FROM community_posts WHERE user_id = ?", Integer.class, userId);
        return count == null ? 0 : count;
    }

    private long sumLikeCount() {
        Long total = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(like_count), 0) FROM community_posts WHERE visibility = 'PUBLIC'", Long.class);
        return total == null ? 0 : total;
    }

    private long sumViewCount() {
        Long total = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(view_count), 0) FROM community_posts WHERE visibility = 'PUBLIC'", Long.class);
        return total == null ? 0 : total;
    }

    private String generateShareCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder builder = new StringBuilder(10);
            for (int i = 0; i < 10; i++) {
                builder.append(SHARE_CODE_ALPHABET.charAt(RANDOM.nextInt(SHARE_CODE_ALPHABET.length())));
            }
            String code = builder.toString();
            if (postRepository.findByShareCodeAndVisibility(code, VISIBILITY_PUBLIC).isEmpty()
                    && postRepository.findByShareCodeAndVisibility(code, VISIBILITY_REMOVED).isEmpty()) {
                return code;
            }
        }
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }

    public String shareUrl(String shareCode) {
        String base = properties.getCommunity().getShareBaseUrl();
        if (base == null || base.isBlank()) {
            base = "/outfit/";
        }
        if (!base.endsWith("/")) {
            base = base + "/";
        }
        return base + shareCode;
    }

    private static String trimTo(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }

    private static List<UUID> parseIds(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(value -> {
                    try {
                        return UUID.fromString(value);
                    } catch (IllegalArgumentException ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private CommunityPostDto toDto(CommunityPost post, UUID viewerId) {
        List<UUID> productIds = parseIds(post.getProductIds());
        List<Product> products = productIds.isEmpty() ? List.of() : productRepository.findAllById(productIds);
        List<CommunityPostDto.ProductRef> productRefs = products.stream()
                .map(product -> CommunityPostDto.ProductRef.builder()
                        .productId(product.getId())
                        .name(product.getName())
                        .imageUrl(productImageRepository
                                .findByProductIdOrderBySortOrderAsc(product.getId()).stream()
                                .findFirst()
                                .map(ProductImage::getImageUrl)
                                .orElse(null))
                        .price(product.getPrice())
                        .build())
                .toList();
        String authorName = userAccountRepository.findById(post.getUserId())
                .map(CommunityService::authorName)
                .orElse("Khách hàng FitMe");
        List<String> brandNames = products.stream()
                .map(Product::getBrandId)
                .distinct()
                .map(brandRepository::findById)
                .flatMap(java.util.Optional::stream)
                .map(Brand::getName)
                .toList();
        return CommunityPostDto.builder()
                .id(post.getId())
                .shareCode(post.getShareCode())
                .shareUrl(shareUrl(post.getShareCode()))
                .title(post.getTitle())
                .caption(post.getCaption())
                .styleLabel(post.getStyleLabel())
                .occasion(post.getOccasion())
                .imageUrl(post.getImageUrl())
                .authorDisplayName(authorName)
                .authorInitials(initials(authorName))
                .brandNames(brandNames)
                .products(productRefs)
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .viewCount(post.getViewCount())
                .likedByMe(hasLiked(viewerId, post.getId()))
                .savedByMe(isSaved(viewerId, post.getId()))
                .mine(viewerId != null && viewerId.equals(post.getUserId()))
                .createdAt(post.getCreatedAt())
                .build();
    }

    private static String authorName(UserAccount user) {
        String name = user.getDisplayName();
        return name != null && !name.isBlank() ? name.trim() : "Khách hàng FitMe";
    }

    static String initials(String name) {
        if (name == null || name.isBlank()) {
            return "?";
        }
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].substring(0, 1).toUpperCase();
        }
        return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
    }
}
