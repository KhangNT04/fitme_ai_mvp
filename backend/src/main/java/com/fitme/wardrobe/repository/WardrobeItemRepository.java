package com.fitme.wardrobe.repository;

import com.fitme.wardrobe.entity.WardrobeItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WardrobeItemRepository extends JpaRepository<WardrobeItem, UUID> {

    List<WardrobeItem> findByUserId(UUID userId);

    List<WardrobeItem> findBySessionId(UUID sessionId);
}
