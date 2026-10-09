package com.fitme.product.repository;

import com.fitme.product.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {

    List<ProductImage> findByProductIdOrderBySortOrderAsc(UUID productId);

    @Query("SELECT DISTINCT i.imageUrl FROM ProductImage i WHERE i.imageUrl LIKE 'http%'")
    List<String> findDistinctAbsoluteImageUrls();

    @Modifying
    @Query("UPDATE ProductImage i SET i.imageUrl = :to WHERE i.imageUrl = :from")
    int replaceImageUrl(@Param("from") String from, @Param("to") String to);
}
