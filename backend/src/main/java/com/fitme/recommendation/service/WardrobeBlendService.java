package com.fitme.recommendation.service;

import com.fitme.common.enums.WardrobeMode;
import com.fitme.wardrobe.entity.WardrobeItem;
import com.fitme.wardrobe.repository.WardrobeItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WardrobeBlendService {

    private final WardrobeItemRepository wardrobeItemRepository;

    public List<WardrobeItem> loadWardrobe(UUID userId, UUID sessionId, WardrobeMode mode) {
        if (mode == WardrobeMode.NEW_ITEMS_ONLY || mode == WardrobeMode.NO_WARDROBE_DATA) {
            return List.of();
        }
        if (userId != null) {
            return wardrobeItemRepository.findByUserId(userId);
        }
        if (sessionId != null) {
            return wardrobeItemRepository.findBySessionId(sessionId);
        }
        return List.of();
    }
}
