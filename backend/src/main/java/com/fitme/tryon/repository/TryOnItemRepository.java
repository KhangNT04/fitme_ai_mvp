package com.fitme.tryon.repository;

import com.fitme.tryon.entity.TryOnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TryOnItemRepository extends JpaRepository<TryOnItem, UUID> {

    List<TryOnItem> findByTryOnRequestId(UUID tryOnRequestId);

    /** Try-on sessions containing at least one of the brand's products; {@code completedOnly} keeps finished ones. */
    @Query(value = """
            SELECT COUNT(DISTINCT ti.try_on_request_id)
            FROM try_on_items ti
            JOIN products p ON p.id = ti.product_id
            JOIN try_on_requests r ON r.id = ti.try_on_request_id
            WHERE p.brand_id = :brandId
              AND (:completedOnly = FALSE OR r.status = 'COMPLETED')
            """, nativeQuery = true)
    long countBrandTryOns(@Param("brandId") UUID brandId, @Param("completedOnly") boolean completedOnly);

    @Query(value = """
            SELECT COUNT(DISTINCT ti.try_on_request_id)
            FROM try_on_items ti
            JOIN try_on_requests r ON r.id = ti.try_on_request_id
            WHERE ti.product_id = :productId
              AND (:completedOnly = FALSE OR r.status = 'COMPLETED')
            """, nativeQuery = true)
    long countProductTryOns(@Param("productId") UUID productId, @Param("completedOnly") boolean completedOnly);

    interface LabelCount {
        String getLabel();
        long getTotal();
    }

    @Query(value = """
            SELECT r.occasion AS label, COUNT(DISTINCT r.id) AS total
            FROM try_on_items ti
            JOIN try_on_requests r ON r.id = ti.try_on_request_id
            WHERE ti.product_id = :productId AND NULLIF(TRIM(r.occasion), '') IS NOT NULL
            GROUP BY r.occasion ORDER BY total DESC LIMIT 6
            """, nativeQuery = true)
    List<LabelCount> topOccasionsForProduct(@Param("productId") UUID productId);

    @Query(value = """
            SELECT ti.selected_size AS label, COUNT(*) AS total
            FROM try_on_items ti
            WHERE ti.product_id = :productId AND NULLIF(TRIM(ti.selected_size), '') IS NOT NULL
            GROUP BY ti.selected_size ORDER BY total DESC LIMIT 8
            """, nativeQuery = true)
    List<LabelCount> topSizesForProduct(@Param("productId") UUID productId);

    @Query(value = """
            SELECT ti.selected_color AS label, COUNT(*) AS total
            FROM try_on_items ti
            WHERE ti.product_id = :productId AND NULLIF(TRIM(ti.selected_color), '') IS NOT NULL
            GROUP BY ti.selected_color ORDER BY total DESC LIMIT 6
            """, nativeQuery = true)
    List<LabelCount> topColorsForProduct(@Param("productId") UUID productId);
}
