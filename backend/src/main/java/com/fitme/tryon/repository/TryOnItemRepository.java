package com.fitme.tryon.repository;

import com.fitme.tryon.entity.TryOnItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TryOnItemRepository extends JpaRepository<TryOnItem, UUID> {

    List<TryOnItem> findByTryOnRequestId(UUID tryOnRequestId);
}
