package com.fitme.product.repository;

import com.fitme.product.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {

    List<ProductVariant> findByProductId(UUID productId);

    @Query(value = "SELECT EXISTS (SELECT 1 FROM order_items WHERE variant_id = :id) "
            + "OR EXISTS (SELECT 1 FROM cart_items WHERE variant_id = :id)", nativeQuery = true)
    boolean isReferenced(@Param("id") UUID id);

    @Modifying
    @Query("update ProductVariant v set v.stockQuantity = v.stockQuantity - :quantity " +
            "where v.id = :id and v.stockQuantity >= :quantity")
    int reserveStock(@Param("id") UUID id, @Param("quantity") int quantity);

    @Modifying
    @Query("update ProductVariant v set v.stockQuantity = v.stockQuantity + :quantity where v.id = :id")
    int restoreStock(@Param("id") UUID id, @Param("quantity") int quantity);
}
