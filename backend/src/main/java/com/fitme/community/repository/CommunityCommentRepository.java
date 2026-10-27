package com.fitme.community.repository;

import com.fitme.community.entity.CommunityComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommunityCommentRepository extends JpaRepository<CommunityComment, UUID> {

    Optional<CommunityComment> findByIdAndPostId(UUID id, UUID postId);

    long countByPostId(UUID postId);

    /** Top-level comments, oldest first — replies are loaded in one extra query. */
    Page<CommunityComment> findByPostIdAndParentIdIsNullOrderByCreatedAtAsc(UUID postId, Pageable pageable);

    List<CommunityComment> findByParentIdInOrderByCreatedAtAsc(List<UUID> parentIds);

    List<CommunityComment> findByPostIdAndUserId(UUID postId, UUID userId);

    @Query("select c from CommunityComment c where c.postId = :postId order by c.createdAt asc")
    List<CommunityComment> findAllByPostId(@Param("postId") UUID postId);
}
