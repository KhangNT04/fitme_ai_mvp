package com.fitme.community.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.community.dto.CommunityCommentDto;
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

    // ── Helpers ────────────────────────────────────────────────────────────────────────────────

    private void publishNotification(CommunityComment comment, CommunityPost post, UUID actorId) {
        UUID postAuthorId = post.getUserId();
        // The author of the answered comment is notified too, unless they own the post.
        if (comment.getParentAuthorId() != null
                && !comment.getParentAuthorId().equals(postAuthorId)
                && !comment.getParentAuthorId().equals(actorId)) {
            events.publishEvent(new CommunityCommentEvent(
                    comment.getId(), post.getId(), comment.getParentAuthorId(), actorId,
                    comment.getParentId(), true));
        }
        if (!postAuthorId.equals(actorId)) {
            events.publishEvent(new CommunityCommentEvent(
                    comment.getId(), post.getId(), postAuthorId, actorId, comment.getParentId(), false));
        }
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
