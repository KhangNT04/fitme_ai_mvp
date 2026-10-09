package com.fitme.storage;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CatalogMediaMirrorRepository extends JpaRepository<CatalogMediaMirror, UUID> {

    Optional<CatalogMediaMirror> findBySourceUrl(String sourceUrl);
}
