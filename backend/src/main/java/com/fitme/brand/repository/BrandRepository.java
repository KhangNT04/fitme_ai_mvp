package com.fitme.brand.repository;

import com.fitme.brand.entity.Brand;
import com.fitme.common.enums.BrandStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BrandRepository extends JpaRepository<Brand, UUID> {

    List<Brand> findByOwnerUserId(UUID ownerUserId);

    List<Brand> findByStatus(BrandStatus status);

    Optional<Brand> findByName(String name);
}
