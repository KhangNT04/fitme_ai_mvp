package com.fitme.review.repository;

import com.fitme.common.enums.ReviewStatus;
import com.fitme.review.entity.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProductReviewRepository extends JpaRepository<ProductReview, UUID> {

    boolean existsByProductIdAndUserId(UUID productId, UUID userId);

    Page<ProductReview> findByProductIdAndStatusOrderByCreatedAtDesc(UUID productId, ReviewStatus status,
                                                                    Pageable pageable);

    @Query("select avg(r.rating) from ProductReview r where r.productId = :productId and r.status = :status")
    Double averageRating(@Param("productId") UUID productId, @Param("status") ReviewStatus status);

    long countByUserIdAndRewardGrantedGreaterThan(UUID userId, int rewardGranted);

    List<ProductReview> findTop100ByOrderByCreatedAtDesc();

    List<ProductReview> findTop100ByStatusOrderByCreatedAtDesc(ReviewStatus status);
}
