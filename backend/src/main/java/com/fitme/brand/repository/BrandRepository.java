package com.fitme.brand.repository;

import com.fitme.brand.entity.Brand;
import com.fitme.common.enums.BrandStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BrandRepository extends JpaRepository<Brand, UUID> {

    List<Brand> findByOwnerUserId(UUID ownerUserId);

    /** Stable pick for owners that manage several brands (seed editorial account). */
    List<Brand> findByOwnerUserIdOrderByCreatedAtAsc(UUID ownerUserId);

    List<Brand> findByStatus(BrandStatus status);

    long countByStatus(BrandStatus status);

    Optional<Brand> findByCatalogKey(String catalogKey);

    /** Legacy rows may share a name, so name lookups always return a list. */
    List<Brand> findByNameIgnoreCaseOrderByCreatedAtAsc(String name);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
}
