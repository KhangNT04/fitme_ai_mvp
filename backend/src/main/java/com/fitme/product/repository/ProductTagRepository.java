package com.fitme.product.repository;

import com.fitme.product.entity.ProductTag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductTagRepository extends JpaRepository<ProductTag, UUID> {

    List<ProductTag> findByProductId(UUID productId);

    List<ProductTag> findByProductIdAndTagType(UUID productId, String tagType);
}
