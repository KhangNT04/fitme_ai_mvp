package com.fitme.community.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.community.dto.CommunityCommentDto;
import com.fitme.community.dto.CommunityCommentNotificationDto;
import com.fitme.community.dto.CreateCommunityCommentRequest;
import com.fitme.community.entity.CommunityComment;
import com.fitme.community.entity.CommunityPost;
import com.fitme.community.repository.CommunityCommentRepository;
import com.fitme.community.repository.CommunityPostRepository;
import com.fitme.notification.CommunityCommentEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Comments on community posts, with a single level of replies.
 *
 * <p>The post's {@code comment_count} is maintained by a database trigger, so a comment never
 * races with a concurrent like or save.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityCommentService {

    private static final int MAX_COMMENT_LENGTH = 1000;
    private static final int MAX_TOP_LEVEL = 200;

    private final CommunityCommentRepository commentRepository;
    private final CommunityPostRepository postRepository;
    private final UserAccountRepository userAccountRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final ApplicationEventPublisher events;

    // ── Read ───────────────────────────────────────────────────────────────────────────────────

    public List<CommunityCommentDto> listByPost(UUID postId, UUID viewerId) {
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Bài đăng không tồn tại"));

        List<CommunityComment> topLevel = commentRepository
                .findByPostIdAndParentIdIsNullOrderByCreatedAtAsc(postId, PageRequest.of(0, MAX_TOP_LEVEL))
                .getContent();
        if (topLevel.isEmpty()) {
            return List.of();
        }

        List<CommunityComment> replies = commentRepository.findByParentIdInOrderByCreatedAtAsc(
                topLevel.stream().map(CommunityComment::getId).toList());
        Map<UUID, List<CommunityComment>> repliesByParent = replies.stream()
                .collect(Collectors.groupingBy(CommunityComment::getParentId));

        // One query for every author instead of one per comment.
        Map<UUID, String> names = authorNames(allComments(topLevel, replies));

        return topLevel.stream()
                .map(comment -> toDto(comment, viewerId, post.getUserId(), repliesByParent.get(comment.getId()), names))
                .toList();
    }

    private static List<CommunityComment> allComments(List<CommunityComment> topLevel,
                                                      List<CommunityComment> replies) {
        List<CommunityComment> all = new ArrayList<>(topLevel);
        all.addAll(replies);
        return all;
    }

    /** Display names for the given comments, resolved in a single query. */
    private Map<UUID, String> authorNames(List<CommunityComment> comments) {
        Set<UUID> ids = new HashSet<>();
        for (CommunityComment comment : comments) {
            ids.add(comment.getUserId());
            if (comment.getParentAuthorId() != null) {
                ids.add(comment.getParentAuthorId());
            }
        }
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<UUID, String> names = new HashMap<>();
        for (UserAccount user : userAccountRepository.findAllById(ids)) {
            String name = user.getDisplayName();
            names.put(user.getId(), name == null || name.isBlank() ? "Khách hàng FitMe" : name.trim());
        }
        return names;
    }

    private static String nameOf(Map<UUID, String> names, UUID userId) {
        if (userId == null) {
            return "Khách hàng FitMe";
        }
        return names.getOrDefault(userId, "Khách hàng FitMe");
    }

    // ── Write ──────────────────────────────────────────────────────────────────────────────────

    @Transactional
    public CommunityCommentDto create(UUID userId, UUID postId, CreateCommunityCommentRequest request) {
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Bài đăng không tồn tại"));
        if (!CommunityService.VISIBILITY_PUBLIC.equals(post.getVisibility())) {
            throw new NotFoundException("Bài đăng không tồn tại");
        }

        String content = request.getContent() == null ? "" : request.getContent().trim();
        if (content.isEmpty()) {
            throw new BusinessException("Nội dung bình luận không được để trống");
        }
        if (content.length() > MAX_COMMENT_LENGTH) {
            throw new BusinessException("Bình luận không được dài quá " + MAX_COMMENT_LENGTH + " ký tự");
        }

        UUID parentId = null;
        UUID parentAuthorId = null;
        if (request.getParentId() != null) {
            CommunityComment parent = commentRepository.findByIdAndPostId(request.getParentId(), postId)
                    .orElseThrow(() -> new NotFoundException("Bình luận cần trả lời không tồn tại"));
            // One level of replies only: replying to a reply attaches to the top-level comment.
            if (parent.getParentId() != null) {
                CommunityComment grandParent = commentRepository.findById(parent.getParentId())
                        .orElseThrow(() -> new NotFoundException("Bình luận cần trả lời không tồn tại"));
                parentId = grandParent.getId();
                parentAuthorId = grandParent.getUserId();
            } else {
                parentId = parent.getId();
                parentAuthorId = parent.getUserId();
            }
        }

        CommunityComment comment = commentRepository.save(CommunityComment.builder()
                .postId(postId)
                .userId(userId)
                .parentId(parentId)
                .parentAuthorId(parentAuthorId)
                .content(content)
                .build());
        // The notification row points at the comment, so the comment has to exist in the database
        // before the insert — otherwise the foreign key fails.
        commentRepository.flush();

        publishNotification(comment, post, userId);

        Map<UUID, String> names = authorNames(List.of(comment));
        return toDto(comment, userId, post.getUserId(), List.of(), names);
    }

    @Transactional
    public void delete(UUID userId, UUID postId, UUID commentId) {
        CommunityComment comment = commentRepository.findByIdAndPostId(commentId, postId)
                .orElseThrow(() -> new NotFoundException("Bình luận không tồn tại"));
        CommunityPost post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Bài đăng không tồn tại"));

        boolean ownComment = comment.getUserId().equals(userId);
        boolean ownPost = post.getUserId().equals(userId);
        if (!ownComment && !ownPost) {
            throw new BusinessException("Bạn không thể xoá bình luận của người khác");
        }
        commentRepository.delete(comment);
    }

    /**
     * The viewer's comment notifications, newest first. Each row is a comment somebody left on
     * the viewer's post or answered on the viewer's comment.
     */
    @Transactional(readOnly = true)
    public List<CommunityCommentNotificationDto> listNotifications(UUID userId, int limit) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT n.id, n.post_id, n.actor_id, n.comment_id, n.created_at, "
                        + "p.share_code, p.title, c.content, c.parent_id "
                        + "FROM community_comment_notifications n "
                        + "JOIN community_posts p ON p.id = n.post_id "
                        + "JOIN community_comments c ON c.id = n.comment_id "
                        + "WHERE n.recipient_id = ? "
                        + "ORDER BY n.created_at DESC LIMIT ?",
                userId, Math.min(Math.max(limit, 1), 100));
        if (rows.isEmpty()) {
            return List.of();
        }
        Set<UUID> actorIds = new HashSet<>();
        for (Map<String, Object> row : rows) {
            actorIds.add((UUID) row.get("actor_id"));
        }
        Map<UUID, String> names = new HashMap<>();
        for (UserAccount user : userAccountRepository.findAllById(actorIds)) {
            String name = user.getDisplayName();
            names.put(user.getId(), name == null || name.isBlank() ? "Khách hàng FitMe" : name.trim());
        }
        return rows.stream()
                .map(row -> toNotificationDto(row, names))
                .toList();
    }

    private static CommunityCommentNotificationDto toNotificationDto(Map<String, Object> row,
                                                                   Map<UUID, String> names) {
        UUID actorId = (UUID) row.get("actor_id");
        String actorName = names.getOrDefault(actorId, "Khách hàng FitMe");
        return CommunityCommentNotificationDto.builder()
                .id((UUID) row.get("id"))
                .postId((UUID) row.get("post_id"))
                .postShareCode((String) row.get("share_code"))
                .postTitle((String) row.get("title"))
                .actorDisplayName(actorName)
                .actorInitials(CommunityService.initials(actorName))
                .content((String) row.get("content"))
                .reply(row.get("parent_id") != null)
                .createdAt(((java.sql.Timestamp) row.get("created_at")).toLocalDateTime())
                .build();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────────────────────

    private void publishNotification(CommunityComment comment, CommunityPost post, UUID actorId) {
        UUID postAuthorId = post.getUserId();
        // The author of the answered comment is notified too, unless they own the post.
        if (comment.getParentAuthorId() != null
                && !comment.getParentAuthorId().equals(postAuthorId)
                && !comment.getParentAuthorId().equals(actorId)) {
            recordNotification(comment, post, comment.getParentAuthorId(), actorId);
            events.publishEvent(new CommunityCommentEvent(
                    comment.getId(), post.getId(), comment.getParentAuthorId(), actorId,
                    comment.getParentId(), true));
        }
        if (!postAuthorId.equals(actorId)) {
            recordNotification(comment, post, postAuthorId, actorId);
            events.publishEvent(new CommunityCommentEvent(
                    comment.getId(), post.getId(), postAuthorId, actorId, comment.getParentId(), false));
        }
    }

    /**
     * Keeps a row so the in-app notification list has something to show. The email is sent from
     * the event, because sending mail inside the request transaction would hold the comment locks.
     */
    private void recordNotification(CommunityComment comment, CommunityPost post, UUID recipientId,
                                    UUID actorId) {
        jdbcTemplate.update(
                "INSERT INTO community_comment_notifications (comment_id, post_id, recipient_id, actor_id) "
                        + "VALUES (?,?,?,?) ON CONFLICT (comment_id, recipient_id) DO NOTHING",
                comment.getId(), post.getId(), recipientId, actorId);
    }

    private CommunityCommentDto toDto(CommunityComment comment, UUID viewerId, UUID postAuthorId,
                                     List<CommunityComment> replies, Map<UUID, String> names) {
        List<CommunityCommentDto> replyDtos = replies == null ? List.of()
                : replies.stream()
                        .map(reply -> toDto(reply, viewerId, postAuthorId, List.of(), names))
                        .toList();
        String authorName = nameOf(names, comment.getUserId());
        boolean mine = viewerId != null && viewerId.equals(comment.getUserId());
        return CommunityCommentDto.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .content(comment.getContent())
                .authorDisplayName(authorName)
                .authorInitials(CommunityService.initials(authorName))
                .mine(mine)
                .canDelete(mine || (viewerId != null && viewerId.equals(postAuthorId)))
                .parentId(comment.getParentId())
                .parentAuthorDisplayName(comment.getParentAuthorId() == null ? null
                        : nameOf(names, comment.getParentAuthorId()))
                .createdAt(comment.getCreatedAt())
                .replies(replyDtos)
                .build();
    }
}
