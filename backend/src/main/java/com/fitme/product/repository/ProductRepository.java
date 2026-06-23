package com.fitme.product.repository;

import com.fitme.common.enums.ProductStatus;
import com.fitme.product.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    List<Product> findByBrandId(UUID brandId);

    List<Product> findByBrandIdAndStatus(UUID brandId, ProductStatus status);

    List<Product> findByStatus(ProductStatus status);

    List<Product> findByCategory(String category);
}
