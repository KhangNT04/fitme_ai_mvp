package com.fitme.community.repository;

import com.fitme.community.entity.CommunityPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, UUID> {

    Optional<CommunityPost> findByShareCodeAndVisibility(String shareCode, String visibility);

    Optional<CommunityPost> findByIdAndUserId(UUID id, UUID userId);

    Page<CommunityPost> findByVisibilityOrderByCreatedAtDesc(String visibility, Pageable pageable);

    Page<CommunityPost> findByVisibilityOrderByLikeCountDescCreatedAtDesc(String visibility, Pageable pageable);

    /** {@code brandIds} is stored wrapped in commas (",id1,id2,") so this LIKE matches whole ids only. */
    @Query("select p from CommunityPost p where p.visibility = 'PUBLIC' and p.brandIds like concat('%,', :brandId, ',%') "
            + "order by p.createdAt desc")
    Page<CommunityPost> findFeedByBrand(@Param("brandId") String brandId, Pageable pageable);

    @Query("select p from CommunityPost p where p.visibility = 'PUBLIC' and (:styleLabel is null or p.styleLabel = :styleLabel) "
            + "order by p.createdAt desc")
    Page<CommunityPost> findFeedByStyle(@Param("styleLabel") String styleLabel, Pageable pageable);

    Page<CommunityPost> findByUserIdAndVisibilityOrderByCreatedAtDesc(UUID userId, String visibility, Pageable pageable);

    long countByUserIdAndVisibility(UUID userId, String visibility);

    List<CommunityPost> findByUserId(UUID userId);

    long countByVisibility(String visibility);

    long countByVisibilityAndCreatedAtAfter(String visibility, Instant after);

    long countByUserIdAndCreatedAtAfter(UUID userId, Instant after);

    @Query("select count(distinct p.userId) from CommunityPost p where p.visibility = 'PUBLIC'")
    long countDistinctAuthors();
}
