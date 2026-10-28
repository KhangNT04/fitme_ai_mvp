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
import com.fitme.preview.service.VtonOutputMirrorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
    private static final int MAX_STYLE_LENGTH = 60;
    private static final int MAX_OCCASION_LENGTH = 60;
    private static final String SHARE_CODE_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CommunityPostRepository postRepository;
    private final OutfitGalleryImageRepository galleryRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final BrandRepository brandRepository;
    private final UserAccountRepository userAccountRepository;
    private final ConsentRecordRepository consentRepository;
    private final CommunityPostContextResolver contextResolver;
    private final AnalyticsService analyticsService;
    private final VtonOutputMirrorService mirrorService;
    private final FitMeProperties properties;
    private final AppClock clock;
    private final JdbcTemplate jdbcTemplate;

    // ── Feed ──────────────────────────────────────────────────────────────────────────────────

    /**
     * The public feed, filtered by brand, style and occasion.
     *
     * <p>Filters combine (a post in the "Minimal" style from a given brand *and* occasion shows
     * up), and the occasion is matched loosely so "Đi làm" also finds posts whose occasion was
     * written as "Đi làm văn phòng".
     */
    public PageResult<CommunityPostDto> feed(UUID viewerId, int page, int size, String brandId, String styleLabel,
                                             String occasion, String sort) {
        int safeSize = Math.min(Math.max(size, 1), 48);
        PageRequest pageable = PageRequest.of(Math.max(page, 0), safeSize);
        boolean popular = "popular".equalsIgnoreCase(sort);

        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder("select * from community_posts where visibility = 'PUBLIC'");
        if (brandId != null && !brandId.isBlank()) {
            // brand_ids is stored wrapped in commas so this LIKE matches whole ids only.
            sql.append(" and brand_ids like ?");
            params.add("%," + brandId + ",%");
        }
        if (styleLabel != null && !styleLabel.isBlank()) {
            sql.append(" and lower(style_label) = lower(?)");
            params.add(styleLabel.trim());
        }
        if (occasion != null && !occasion.isBlank()) {
            sql.append(" and lower(occasion) = lower(?)");
            params.add(occasion.trim());
        }
        sql.append(popular
                ? " order by like_count desc, created_at desc"
                : " order by created_at desc");
        sql.append(" limit ? offset ?");
        params.add(safeSize);
        params.add(Math.max(page, 0) * safeSize);

        List<CommunityPost> posts = jdbcTemplate.query(
                sql.toString(),
                (rs, rowNum) -> mapPost(rs),
                params.toArray());

        Long total = jdbcTemplate.queryForObject(
                "select count(*) from community_posts" + filterClause(brandId, styleLabel, occasion),
                Long.class,
                filterParams(brandId, styleLabel, occasion).toArray());

        return new PageResult<>(posts.stream().map(post -> toDto(post, viewerId)).toList(),
                Math.max(page, 0), safeSize, total == null ? 0L : total);
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

    /**
     * Posts the given user published, whatever their visibility. Used by the author themselves
     * to review and remove what they shared.
     */
    public PageResult<CommunityPostDto> listByOwner(UUID ownerId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 48);
        return PageResult.of(
                postRepository.findByUserIdOrderByCreatedAtDesc(ownerId, PageRequest.of(Math.max(page, 0), safeSize)),
                post -> toDto(post, ownerId));
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
        String imageUrl = mirrorImageForSharing(image);
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

        // Recover the style and occasion behind the photo so the post is labelled like the
        // outfit the stylist produced, not a generic "Outfit".
        CommunityPostContextResolver.PostContext context = contextResolver.resolve(
                image.getTryOnRequestId(), request.getRecommendationId(), userId);

        CommunityPost post = postRepository.save(CommunityPost.builder()
                .userId(userId)
                .galleryImageId(image.getId())
                .tryOnRequestId(image.getTryOnRequestId())
                .recommendationId(request.getRecommendationId())
                .shareCode(generateShareCode())
                .title(trimTo(request.getTitle(), MAX_TITLE_LENGTH))
                .caption(trimTo(request.getCaption(), MAX_CAPTION_LENGTH))
                .styleLabel(trimTo(context.styleLabel(), MAX_STYLE_LENGTH))
                .occasion(trimTo(context.occasion(), MAX_OCCASION_LENGTH))
                .brandIds(wrappedBrandIds)
                .productIds(productIds.isEmpty() ? null : productIds.stream()
                        .map(UUID::toString).collect(Collectors.joining(",")))
                .imageUrl(imageUrl)
                .visibility(VISIBILITY_PUBLIC)
                .build());

        analyticsService.track("COMMUNITY_POST_CREATED", userId, null, null, null, null,
                post.getTryOnRequestId(), Map.of("postId", post.getId().toString()));

        return CreateCommunityPostResult.builder()
                .post(toDto(post, userId))
                .shareUrl(shareUrl(post.getShareCode()))
                .build();
    }

    /**
     * Updates the words of a post the signed-in user published.
     *
     * <p>Only the title and caption can change: the photo, style and occasion stay as they
     * were, so a link shared earlier keeps pointing at the same outfit.
     */
    @Transactional
    public CommunityPostDto update(UUID userId, UUID postId, UpdateCommunityPostRequest request) {
        CommunityPost post = postRepository.findByIdAndUserId(postId, userId)
                .orElseThrow(() -> new NotFoundException("Bài đăng không tồn tại"));
        if (VISIBILITY_REMOVED.equals(post.getVisibility())) {
            throw new BusinessException("Bài đăng đã bị gỡ, bạn không thể sửa nữa", "COMMUNITY_POST_REMOVED");
        }
        if (request.getTitle() != null) {
            post.setTitle(trimTo(request.getTitle(), MAX_TITLE_LENGTH));
        }
        if (request.getCaption() != null) {
            post.setCaption(trimTo(request.getCaption(), MAX_CAPTION_LENGTH));
        }
        postRepository.save(post);
        return toDto(post, userId);
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

    // ── Filter options ────────────────────────────────────────────────────────────────────────

    /**
     * The style, occasion and brand filters a reader can pick, with the number of public posts
     * behind each. Only values that exist on public posts are offered.
     */
    public CommunityFilterOptionsDto filterOptions() {
        List<CommunityFilterOptionsDto.FilterOption> styles = jdbcTemplate.query(
                "select style_label as value, count(*) as count from community_posts "
                        + "where visibility = 'PUBLIC' and style_label is not null and style_label <> '' "
                        + "group by style_label order by count(*) desc, style_label asc",
                (rs, rowNum) -> CommunityFilterOptionsDto.FilterOption.builder()
                        .value(rs.getString("value"))
                        .label(rs.getString("value"))
                        .count(rs.getLong("count"))
                        .build());

        List<CommunityFilterOptionsDto.FilterOption> occasions = jdbcTemplate.query(
                "select occasion as value, count(*) as count from community_posts "
                        + "where visibility = 'PUBLIC' and occasion is not null and occasion <> '' "
                        + "group by occasion order by count(*) desc, occasion asc",
                (rs, rowNum) -> CommunityFilterOptionsDto.FilterOption.builder()
                        .value(rs.getString("value"))
                        .label(rs.getString("value"))
                        .count(rs.getLong("count"))
                        .build());

        // Brands are stored as ids; the names come from the brand table.
        Map<String, Long> brandCounts = new LinkedHashMap<>();
        jdbcTemplate.query("select brand_ids from community_posts "
                        + "where visibility = 'PUBLIC' and brand_ids is not null and brand_ids <> ''",
                rs -> {
                    String raw = rs.getString("brand_ids");
                    for (String part : raw.split(",")) {
                        String id = part.trim();
                        if (!id.isEmpty()) {
                            brandCounts.merge(id, 1L, Long::sum);
                        }
                    }
                });
        List<CommunityFilterOptionsDto.FilterOption> brands = brandCounts.entrySet().stream()
                .map(entry -> {
                    String name = brandRepository.findById(UUID.fromString(entry.getKey()))
                            .map(Brand::getName)
                            .orElse(null);
                    if (name == null) {
                        return null;
                    }
                    return CommunityFilterOptionsDto.FilterOption.builder()
                            .value(entry.getKey())
                            .label(name)
                            .count(entry.getValue())
                            .build();
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(CommunityFilterOptionsDto.FilterOption::getCount).reversed()
                        .thenComparing(CommunityFilterOptionsDto.FilterOption::getLabel))
                .toList();

        return CommunityFilterOptionsDto.builder()
                .styles(styles)
                .occasions(occasions)
                .brands(brands)
                .build();
    }

    /** Follows the author behind this public key. */
    @Transactional
    public boolean followByAuthorKey(UUID userId, String authorKey) {
        return follow(userId, resolveAuthorId(authorKey));
    }

    /** Stops following the author behind this public key. */
    @Transactional
    public boolean unfollowByAuthorKey(UUID userId, String authorKey) {
        return unfollow(userId, resolveAuthorId(authorKey));
    }

    private UUID resolveAuthorId(String authorKey) {
        if (authorKey == null || authorKey.isBlank()) {
            throw new NotFoundException("Không tìm thấy người dùng này");
        }
        UUID parsed;
        try {
            parsed = UUID.fromString(authorKey.trim());
        } catch (IllegalArgumentException ex) {
            throw new NotFoundException("Không tìm thấy người dùng này");
        }
        return userAccountRepository.findByCommunityAuthorKey(parsed)
                .map(UserAccount::getId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng này"));
    }

    // ── Author profiles ───────────────────────────────────────────────────────────────────────

    /**
     * The public profile of an author, looked up by their public author key.
     *
     * @param authorKey the random public key, never the account id
     * @param viewerId the signed-in viewer, used to tell whether they follow this author
     */
    public CommunityAuthorDto authorProfile(String authorKey, UUID viewerId) {
        UserAccount author = userAccountRepository.findById(resolveAuthorId(authorKey))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng này"));

        Long likes = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(like_count), 0) FROM community_posts WHERE user_id = ? AND visibility = 'PUBLIC'",
                Long.class, author.getId());
        Long comments = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM community_comments c JOIN community_posts p ON p.id = c.post_id "
                        + "WHERE p.user_id = ? AND p.visibility = 'PUBLIC'",
                Long.class, author.getId());

        String displayName = authorName(author);
        return CommunityAuthorDto.builder()
                .authorKey(author.getCommunityAuthorKey().toString())
                .displayName(displayName)
                .initials(initials(displayName))
                .publishedPosts(postRepository.countByUserIdAndVisibility(author.getId(), VISIBILITY_PUBLIC))
                .totalLikes(likes == null ? 0 : likes)
                .totalComments(comments == null ? 0 : comments)
                .followedByMe(viewerId != null && isFollowing(viewerId, author.getId()))
                .build();
    }

    /**
     * The public posts of an author, addressed by their public author key.
     */
    public PageResult<CommunityPostDto> listByAuthorKey(String authorKey, UUID viewerId, int page, int size) {
        UUID authorId = resolveAuthorId(authorKey);
        int safeSize = Math.min(Math.max(size, 1), 48);
        return PageResult.of(
                postRepository.findByUserIdAndVisibilityOrderByCreatedAtDesc(authorId, VISIBILITY_PUBLIC,
                        PageRequest.of(Math.max(page, 0), safeSize)),
                post -> toDto(post, viewerId));
    }

    // ── Profile & stats ────────────────────────────────────────────────────────────────────────

    public CommunityProfileDto profile(UUID userId) {
        String authorKey = userAccountRepository.findById(userId)
                .map(UserAccount::getCommunityAuthorKey)
                .map(UUID::toString)
                .orElse(null);
        return CommunityProfileDto.builder()
                .publishedPosts((int) postRepository.countByUserIdAndVisibility(userId, VISIBILITY_PUBLIC))
                .savedPosts(countSaved(userId))
                .followers(countFollowers(userId))
                .following(countFollowing(userId))
                .totalLikesReceived(totalLikesReceived(userId))
                .authorKey(authorKey)
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

    /** The WHERE fragment shared by the feed query and its count query. */
    private static String filterClause(String brandId, String styleLabel, String occasion) {
        StringBuilder clause = new StringBuilder(" where visibility = 'PUBLIC'");
        if (brandId != null && !brandId.isBlank()) {
            clause.append(" and brand_ids like ?");
        }
        if (styleLabel != null && !styleLabel.isBlank()) {
            clause.append(" and lower(style_label) = lower(?)");
        }
        if (occasion != null && !occasion.isBlank()) {
            clause.append(" and lower(occasion) = lower(?)");
        }
        return clause.toString();
    }

    private static List<Object> filterParams(String brandId, String styleLabel, String occasion) {
        List<Object> params = new ArrayList<>();
        if (brandId != null && !brandId.isBlank()) {
            params.add("%," + brandId + ",%");
        }
        if (styleLabel != null && !styleLabel.isBlank()) {
            params.add(styleLabel.trim());
        }
        if (occasion != null && !occasion.isBlank()) {
            params.add(occasion.trim());
        }
        return params;
    }

    /** Reads a community post row into its entity, so the feed can use plain SQL. */
    private static CommunityPost mapPost(java.sql.ResultSet rs) throws java.sql.SQLException {
        CommunityPost post = new CommunityPost();
        post.setId(rs.getObject("id", java.util.UUID.class));
        post.setUserId(rs.getObject("user_id", java.util.UUID.class));
        post.setGalleryImageId(rs.getObject("gallery_image_id", java.util.UUID.class));
        post.setTryOnRequestId(rs.getObject("try_on_request_id", java.util.UUID.class));
        post.setRecommendationId(rs.getObject("recommendation_id", java.util.UUID.class));
        post.setShareCode(rs.getString("share_code"));
        post.setTitle(rs.getString("title"));
        post.setCaption(rs.getString("caption"));
        post.setStyleLabel(rs.getString("style_label"));
        post.setOccasion(rs.getString("occasion"));
        post.setBrandIds(rs.getString("brand_ids"));
        post.setProductIds(rs.getString("product_ids"));
        post.setImageUrl(rs.getString("image_url"));
        post.setVisibility(rs.getString("visibility"));
        post.setLikeCount(rs.getInt("like_count"));
        post.setCommentCount(rs.getInt("comment_count"));
        post.setViewCount(rs.getInt("view_count"));
        post.setHiddenAt(rs.getTimestamp("hidden_at") == null
                ? null : rs.getTimestamp("hidden_at").toInstant());
        post.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        return post;
    }

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
        List<Product> products = productIds.isEmpty() ? List.of() : productRepository.findAllById(productIds);        List<CommunityPostDto.ProductRef> productRefs = products.stream()
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
        UserAccount author = userAccountRepository.findById(post.getUserId()).orElse(null);
        String authorName = author == null ? "Khách hàng FitMe" : authorName(author);
        String authorKey = author == null || author.getCommunityAuthorKey() == null
                ? null
                : author.getCommunityAuthorKey().toString();
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
                .imageUrl(resolveImageUrl(post))
                .visibility(post.getVisibility())
                .authorDisplayName(authorName)
                .authorInitials(initials(authorName))
                .authorKey(authorKey)
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

    /**
     * Copies the photo into our own storage before it is shared.
     *
     * <p>The provider that produced the try-on deletes its files after a short while, so a post
     * that keeps the provider URL turns into a broken image for every reader. Mirroring here
     * means the published post points at a file we own.
     *
     * @return the permanent URL, or the original one when the copy is not possible
     */
    private String mirrorImageForSharing(OutfitGalleryImage image) {
        String source = image.getImageUrl();
        if (source == null || source.isBlank() || !VtonOutputMirrorService.isEphemeralVtonOutputUrl(source)) {
            return source;
        }
        try {
            String mirrored = mirrorService.persistRemoteOutput(source, image.getPreviewGenerationId());
            if (mirrored != null && !mirrored.isBlank() && !mirrored.equals(source)) {
                image.setImageUrl(mirrored);
                galleryRepository.save(image);
                return mirrored;
            }
        } catch (Exception ex) {
            log.warn("Could not mirror gallery image {} for sharing: {}", image.getId(), ex.getMessage());
        }
        return source;
    }

    /**
     * The photo a post shows.
     *
     * <p>The post keeps a snapshot of the URL that was live when it was published, but the
     * provider (FASHN's CDN) deletes those files after a while. The gallery row is the
     * authority: it is re-mirrored into our own storage, so we always show the copy we own.
     */
    private String resolveImageUrl(CommunityPost post) {
        String stored = post.getImageUrl();
        if (post.getGalleryImageId() == null) {
            return stored;
        }
        return galleryRepository.findById(post.getGalleryImageId())
                .map(OutfitGalleryImage::getImageUrl)
                .filter(url -> url != null && !url.isBlank())
                .orElse(stored);
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
