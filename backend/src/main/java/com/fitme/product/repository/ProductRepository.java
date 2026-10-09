package com.fitme.product.repository;

import com.fitme.common.enums.ProductStatus;
import com.fitme.product.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    List<Product> findByBrandId(UUID brandId);

    List<Product> findByBrandIdAndStatus(UUID brandId, ProductStatus status);

    boolean existsByIdAndBrandId(UUID id, UUID brandId);

    List<Product> findByStatus(ProductStatus status);

    long countByStatus(ProductStatus status);

    List<Product> findByNameStartingWith(String prefix);

    List<Product> findByCategory(String category);

    /** Reviews, leads, clicks, try-ons, outfits or analytics point at the product — hard delete would lose them. */
    @Query(value = """
            SELECT EXISTS (SELECT 1 FROM product_reviews WHERE product_id = :id)
                OR EXISTS (SELECT 1 FROM brand_leads WHERE product_id = :id)
                OR EXISTS (SELECT 1 FROM buy_click_events WHERE product_id = :id)
                OR EXISTS (SELECT 1 FROM try_on_items WHERE product_id = :id)
                OR EXISTS (SELECT 1 FROM recommendation_items WHERE product_id = :id)
                OR EXISTS (SELECT 1 FROM outfit_requests WHERE selected_product_id = :id)
                OR EXISTS (SELECT 1 FROM flagged_links WHERE product_id = :id)
                OR EXISTS (SELECT 1 FROM analytics_events WHERE product_id = :id)
            """, nativeQuery = true)
    boolean hasCustomerHistory(@Param("id") UUID id);
}
