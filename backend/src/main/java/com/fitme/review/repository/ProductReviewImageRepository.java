package com.fitme.review.repository;

import com.fitme.review.entity.ProductReviewImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ProductReviewImageRepository extends JpaRepository<ProductReviewImage, UUID> {

    List<ProductReviewImage> findByReviewIdOrderBySortOrderAsc(UUID reviewId);

    List<ProductReviewImage> findByReviewIdInOrderBySortOrderAsc(Collection<UUID> reviewIds);
}
