package com.fitme.wardrobe.service;

import com.fitme.common.enums.ConsentType;
import com.fitme.common.enums.SourceType;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.privacy.service.PrivacyService;
import com.fitme.storage.StorageService;
import com.fitme.wardrobe.dto.WardrobeItemRequest;
import com.fitme.wardrobe.dto.WardrobeItemResponse;
import com.fitme.wardrobe.entity.WardrobeItem;
import com.fitme.wardrobe.repository.WardrobeItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WardrobeService {

    private final WardrobeItemRepository wardrobeItemRepository;
    private final StorageService storageService;
    private final PrivacyService privacyService;

    public List<WardrobeItemResponse> list() {
        return findItems().stream().map(this::toResponse).toList();
    }

    @Transactional
    public WardrobeItemResponse create(WardrobeItemRequest request) {
        WardrobeItem item = WardrobeItem.builder()
                .userId(RequestContext.getCurrentUserId().orElse(null))
                .sessionId(RequestContext.getSessionId().orElse(null))
                .name(request.getName())
                .itemType(request.getItemType())
                .category(request.getCategory())
                .color(request.getColor())
                .material(request.getMaterial())
                .fitType(request.getFitType())
                .styleTags(request.getStyleTags())
                .sourceType(SourceType.USER_WARDROBE)
                .build();
        return toResponse(wardrobeItemRepository.save(item));
    }

    @Transactional
    public WardrobeItemResponse update(UUID id, WardrobeItemRequest request) {
        WardrobeItem item = getOwned(id);
        item.setName(request.getName());
        item.setItemType(request.getItemType());
        item.setCategory(request.getCategory());
        item.setColor(request.getColor());
        item.setMaterial(request.getMaterial());
        item.setFitType(request.getFitType());
        item.setStyleTags(request.getStyleTags());
        return toResponse(wardrobeItemRepository.save(item));
    }

    @Transactional
    public void delete(UUID id) throws IOException {
        WardrobeItem item = getOwned(id);
        storageService.delete(item.getImageUrl());
        wardrobeItemRepository.delete(item);
    }

    @Transactional
    public WardrobeItemResponse uploadImage(UUID id, MultipartFile file) throws IOException {
        if (!privacyService.hasConsent(ConsentType.WARDROBE_IMAGE_UPLOAD)) {
            throw new BusinessException("Cần đồng ý upload ảnh tủ đồ trước");
        }
        WardrobeItem item = getOwned(id);
        String previousPath = item.getImageUrl();
        String path = storageService.store("wardrobe", id + "-" + file.getOriginalFilename(), file);
        item.setImageUrl(path);
        WardrobeItem saved = wardrobeItemRepository.save(item);
        if (previousPath != null && !previousPath.equals(path)) {
            storageService.delete(previousPath);
        }
        return toResponse(saved);
    }

    private List<WardrobeItem> findItems() {
        return RequestContext.getCurrentUserId()
                .map(wardrobeItemRepository::findByUserId)
                .or(() -> RequestContext.getSessionId().map(wardrobeItemRepository::findBySessionId))
                .orElse(List.of());
    }

    private WardrobeItem getOwned(UUID id) {
        WardrobeItem item = wardrobeItemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Món tủ đồ không tồn tại"));
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId != null && userId.equals(item.getUserId())) return item;
        if (sessionId != null && sessionId.equals(item.getSessionId())) return item;
        throw new BusinessException("Không có quyền truy cập món tủ đồ này");
    }

    private WardrobeItemResponse toResponse(WardrobeItem item) {
        return WardrobeItemResponse.builder()
                .id(item.getId())
                .name(item.getName())
                .itemType(item.getItemType())
                .category(item.getCategory())
                .color(item.getColor())
                .material(item.getMaterial())
                .fitType(item.getFitType())
                .styleTags(item.getStyleTags())
                .imageUrl(item.getImageUrl())
                .createdAt(item.getCreatedAt())
                .build();
    }
}
