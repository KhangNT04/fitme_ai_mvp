package com.fitme.shopchat.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.brand.service.BrandService;
import com.fitme.common.dto.PageResult;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.shopchat.dto.ShopChatDtos.MessageDto;
import com.fitme.shopchat.dto.ShopChatDtos.OpenThreadRequest;
import com.fitme.shopchat.dto.ShopChatDtos.ThreadDetailDto;
import com.fitme.shopchat.dto.ShopChatDtos.ThreadDto;
import com.fitme.auth.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShopChatService {

    private final JdbcTemplate jdbcTemplate;
    private final BrandRepository brandRepository;
    private final BrandService brandService;
    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final UserAccountRepository userAccountRepository;

    @Transactional
    public ThreadDetailDto openOrGetForUser(UUID userId, OpenThreadRequest request) {
        UUID brandId = resolveBrandId(request);
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new NotFoundException("Thương hiệu không tồn tại"));
        if (brand.getStatus() != BrandStatus.APPROVED) {
            throw new BusinessException("Thương hiệu này chưa nhận tin nhắn");
        }
        if (brand.getOwnerUserId() != null && brand.getOwnerUserId().equals(userId)) {
            throw new BusinessException("Bạn không thể nhắn chính thương hiệu của mình");
        }

        UUID productId = request.getProductId();
        if (productId != null) {
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
            if (!brandId.equals(product.getBrandId())) {
                throw new BusinessException("Sản phẩm không thuộc thương hiệu này");
            }
        }

        UUID threadId = findThreadId(brandId, userId);
        if (threadId == null) {
            threadId = UUID.randomUUID();
            jdbcTemplate.update(
                    "INSERT INTO shop_chat_threads "
                            + "(id, brand_id, user_id, product_id, try_on_request_id, community_post_id, "
                            + "status, last_message_at, created_at, updated_at) "
                            + "VALUES (?, ?, ?, ?, ?, ?, 'OPEN', NOW(), NOW(), NOW())",
                    threadId, brandId, userId, productId, request.getTryOnRequestId(), request.getCommunityPostId());
            String opener = request.getFirstMessage() != null && !request.getFirstMessage().isBlank()
                    ? request.getFirstMessage().trim()
                    : defaultFirstMessage(productId);
            appendMessage(threadId, userId, "USER", opener, true);
        } else if (productId != null) {
            jdbcTemplate.update(
                    "UPDATE shop_chat_threads SET product_id = COALESCE(product_id, ?), "
                            + "try_on_request_id = COALESCE(try_on_request_id, ?), "
                            + "community_post_id = COALESCE(community_post_id, ?), "
                            + "updated_at = NOW() WHERE id = ? AND status <> 'LOCKED'",
                    productId, request.getTryOnRequestId(), request.getCommunityPostId(), threadId);
            if (request.getFirstMessage() != null && !request.getFirstMessage().isBlank()) {
                appendMessage(threadId, userId, "USER", request.getFirstMessage().trim(), true);
            }
        }
        return detail(threadId, userId, "USER");
    }

    public PageResult<ThreadDto> listForUser(UUID userId, int page, int size) {
        return listThreads("user_id", userId, "user_unread_count", page, size);
    }

    public PageResult<ThreadDto> listForBrandOwner(UUID ownerUserId, int page, int size) {
        Brand brand = brandService.getBrandForOwner(ownerUserId);
        return listThreads("brand_id", brand.getId(), "brand_unread_count", page, size);
    }

    public PageResult<ThreadDto> listForAdmin(int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        List<ThreadDto> items = jdbcTemplate.query(
                "SELECT t.*, b.name AS brand_name, u.display_name AS user_name, p.name AS product_name "
                        + "FROM shop_chat_threads t "
                        + "JOIN brands b ON b.id = t.brand_id "
                        + "JOIN user_accounts u ON u.id = t.user_id "
                        + "LEFT JOIN products p ON p.id = t.product_id "
                        + "ORDER BY t.last_message_at DESC LIMIT ? OFFSET ?",
                (rs, i) -> mapThread(rs, rs.getInt("brand_unread_count") + rs.getInt("user_unread_count")),
                safeSize, Math.max(page, 0) * safeSize);
        Long total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM shop_chat_threads", Long.class);
        return new PageResult<>(items, Math.max(page, 0), safeSize, total == null ? 0L : total);
    }

    public ThreadDetailDto getForUser(UUID userId, UUID threadId) {
        assertParticipant(threadId, userId, null);
        markRead(threadId, "USER");
        return detail(threadId, userId, "USER");
    }

    public ThreadDetailDto getForBrand(UUID ownerUserId, UUID threadId) {
        Brand brand = brandService.getBrandForOwner(ownerUserId);
        assertParticipant(threadId, null, brand.getId());
        markRead(threadId, "BRAND");
        return detail(threadId, ownerUserId, "BRAND");
    }

    public ThreadDetailDto getForAdmin(UUID threadId) {
        return detail(threadId, null, "ADMIN");
    }

    @Transactional
    public MessageDto sendAsUser(UUID userId, UUID threadId, String body) {
        assertParticipant(threadId, userId, null);
        assertOpen(threadId);
        return appendMessage(threadId, userId, "USER", requireBody(body), true);
    }

    @Transactional
    public MessageDto sendAsBrand(UUID ownerUserId, UUID threadId, String body) {
        Brand brand = brandService.getBrandForOwner(ownerUserId);
        assertParticipant(threadId, null, brand.getId());
        assertOpen(threadId);
        return appendMessage(threadId, ownerUserId, "BRAND", requireBody(body), false);
    }

    @Transactional
    public MessageDto sendAsAdmin(UUID adminId, UUID threadId, String body) {
        return appendMessage(threadId, adminId, "ADMIN", requireBody(body), null);
    }

    @Transactional
    public void setStatus(UUID threadId, String status, UUID actorBrandId) {
        String next = status == null ? "" : status.trim().toUpperCase();
        if (!List.of("OPEN", "CLOSED", "LOCKED").contains(next)) {
            throw new BusinessException("Trạng thái không hợp lệ");
        }
        if (actorBrandId != null) {
            assertParticipant(threadId, null, actorBrandId);
            if ("LOCKED".equals(next)) {
                throw new BusinessException("Chỉ admin mới khóa hội thoại");
            }
        }
        jdbcTemplate.update(
                "UPDATE shop_chat_threads SET status = ?, updated_at = NOW() WHERE id = ?",
                next, threadId);
    }

    private PageResult<ThreadDto> listThreads(String ownerColumn, UUID ownerId, String unreadColumn, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        List<ThreadDto> items = jdbcTemplate.query(
                "SELECT t.*, b.name AS brand_name, u.display_name AS user_name, p.name AS product_name "
                        + "FROM shop_chat_threads t "
                        + "JOIN brands b ON b.id = t.brand_id "
                        + "JOIN user_accounts u ON u.id = t.user_id "
                        + "LEFT JOIN products p ON p.id = t.product_id "
                        + "WHERE t." + ownerColumn + " = ? "
                        + "ORDER BY t.last_message_at DESC LIMIT ? OFFSET ?",
                (rs, i) -> mapThread(rs, rs.getInt(unreadColumn)),
                ownerId, safeSize, Math.max(page, 0) * safeSize);
        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM shop_chat_threads WHERE " + ownerColumn + " = ?",
                Long.class, ownerId);
        return new PageResult<>(items, Math.max(page, 0), safeSize, total == null ? 0L : total);
    }

    private ThreadDetailDto detail(UUID threadId, UUID viewerId, String viewerRole) {
        ThreadDto thread = jdbcTemplate.query(
                "SELECT t.*, b.name AS brand_name, u.display_name AS user_name, p.name AS product_name "
                        + "FROM shop_chat_threads t "
                        + "JOIN brands b ON b.id = t.brand_id "
                        + "JOIN user_accounts u ON u.id = t.user_id "
                        + "LEFT JOIN products p ON p.id = t.product_id "
                        + "WHERE t.id = ?",
                (rs, i) -> mapThread(rs, "USER".equals(viewerRole)
                        ? rs.getInt("user_unread_count")
                        : "BRAND".equals(viewerRole) ? rs.getInt("brand_unread_count") : 0),
                threadId).stream().findFirst()
                .orElseThrow(() -> new NotFoundException("Hội thoại không tồn tại"));

        if (thread.getProductId() != null) {
            productImageRepository.findByProductIdInOrderBySortOrderAsc(List.of(thread.getProductId())).stream()
                    .findFirst()
                    .ifPresent(img -> thread.setProductImageUrl(img.getImageUrl()));
        }

        List<MessageDto> messages = jdbcTemplate.query(
                "SELECT m.*, u.display_name AS sender_name FROM shop_chat_messages m "
                        + "LEFT JOIN user_accounts u ON u.id = m.sender_user_id "
                        + "WHERE m.thread_id = ? ORDER BY m.created_at ASC",
                (rs, i) -> MessageDto.builder()
                        .id((UUID) rs.getObject("id"))
                        .threadId((UUID) rs.getObject("thread_id"))
                        .senderUserId((UUID) rs.getObject("sender_user_id"))
                        .senderRole(rs.getString("sender_role"))
                        .senderDisplayName(rs.getString("sender_name"))
                        .body(rs.getString("body"))
                        .createdAt(toInstant(rs.getTimestamp("created_at")))
                        .build(),
                threadId);
        return ThreadDetailDto.builder().thread(thread).messages(messages).build();
    }

    private MessageDto appendMessage(UUID threadId, UUID senderUserId, String role, String body, Boolean fromUser) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO shop_chat_messages (id, thread_id, sender_user_id, sender_role, body, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, NOW())",
                id, threadId, senderUserId, role, body);
        String preview = body.length() > 280 ? body.substring(0, 277) + "..." : body;
        if (fromUser == null) {
            jdbcTemplate.update(
                    "UPDATE shop_chat_threads SET last_message_at = NOW(), last_message_preview = ?, "
                            + "user_unread_count = user_unread_count + 1, brand_unread_count = brand_unread_count + 1, "
                            + "updated_at = NOW() WHERE id = ?",
                    preview, threadId);
        } else if (fromUser) {
            jdbcTemplate.update(
                    "UPDATE shop_chat_threads SET last_message_at = NOW(), last_message_preview = ?, "
                            + "brand_unread_count = brand_unread_count + 1, updated_at = NOW() WHERE id = ?",
                    preview, threadId);
        } else {
            jdbcTemplate.update(
                    "UPDATE shop_chat_threads SET last_message_at = NOW(), last_message_preview = ?, "
                            + "user_unread_count = user_unread_count + 1, updated_at = NOW() WHERE id = ?",
                    preview, threadId);
        }
        String name = userAccountRepository.findById(senderUserId).map(u -> u.getDisplayName()).orElse(null);
        return MessageDto.builder()
                .id(id)
                .threadId(threadId)
                .senderUserId(senderUserId)
                .senderRole(role)
                .senderDisplayName(name)
                .body(body)
                .createdAt(Instant.now())
                .build();
    }

    private void markRead(UUID threadId, String role) {
        if ("USER".equals(role)) {
            jdbcTemplate.update("UPDATE shop_chat_threads SET user_unread_count = 0 WHERE id = ?", threadId);
        } else if ("BRAND".equals(role)) {
            jdbcTemplate.update("UPDATE shop_chat_threads SET brand_unread_count = 0 WHERE id = ?", threadId);
        }
    }

    private void assertOpen(UUID threadId) {
        String status = jdbcTemplate.queryForObject(
                "SELECT status FROM shop_chat_threads WHERE id = ?", String.class, threadId);
        if ("LOCKED".equals(status)) {
            throw new BusinessException("Hội thoại đã bị khóa bởi quản trị viên");
        }
        if ("CLOSED".equals(status)) {
            jdbcTemplate.update("UPDATE shop_chat_threads SET status = 'OPEN' WHERE id = ?", threadId);
        }
    }

    private void assertParticipant(UUID threadId, UUID userId, UUID brandId) {
        Integer ok;
        if (userId != null) {
            ok = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM shop_chat_threads WHERE id = ? AND user_id = ?",
                    Integer.class, threadId, userId);
        } else {
            ok = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM shop_chat_threads WHERE id = ? AND brand_id = ?",
                    Integer.class, threadId, brandId);
        }
        if (ok == null || ok == 0) {
            throw new NotFoundException("Hội thoại không tồn tại");
        }
    }

    private UUID findThreadId(UUID brandId, UUID userId) {
        List<UUID> ids = jdbcTemplate.queryForList(
                "SELECT id FROM shop_chat_threads WHERE brand_id = ? AND user_id = ?",
                UUID.class, brandId, userId);
        return ids.isEmpty() ? null : ids.get(0);
    }

    private UUID resolveBrandId(OpenThreadRequest request) {
        if (request.getBrandId() != null) {
            return request.getBrandId();
        }
        if (request.getProductId() != null) {
            return productRepository.findById(request.getProductId())
                    .map(Product::getBrandId)
                    .orElseThrow(() -> new NotFoundException("Sản phẩm không tồn tại"));
        }
        throw new BusinessException("Cần chọn thương hiệu hoặc sản phẩm để nhắn shop");
    }

    private String defaultFirstMessage(UUID productId) {
        if (productId == null) {
            return "Xin chào shop, mình muốn hỏi thêm về sản phẩm trên FitMe.";
        }
        String name = productRepository.findById(productId).map(Product::getName).orElse("sản phẩm");
        return "Xin chào shop, mình muốn hỏi về \"" + name + "\" trên FitMe.";
    }

    private static String requireBody(String body) {
        if (body == null || body.isBlank()) {
            throw new BusinessException("Nội dung tin nhắn không được trống");
        }
        String trimmed = body.trim();
        if (trimmed.length() > 2000) {
            throw new BusinessException("Tin nhắn tối đa 2000 ký tự");
        }
        return trimmed;
    }

    private ThreadDto mapThread(java.sql.ResultSet rs, int unread) throws java.sql.SQLException {
        return ThreadDto.builder()
                .id((UUID) rs.getObject("id"))
                .brandId((UUID) rs.getObject("brand_id"))
                .brandName(rs.getString("brand_name"))
                .userId((UUID) rs.getObject("user_id"))
                .userDisplayName(rs.getString("user_name"))
                .productId((UUID) rs.getObject("product_id"))
                .productName(rs.getString("product_name"))
                .status(rs.getString("status"))
                .lastMessagePreview(rs.getString("last_message_preview"))
                .lastMessageAt(toInstant(rs.getTimestamp("last_message_at")))
                .unreadCount(unread)
                .createdAt(toInstant(rs.getTimestamp("created_at")))
                .build();
    }

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }
}
