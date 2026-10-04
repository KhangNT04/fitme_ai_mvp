package com.fitme.tryon.service;

import com.fitme.brand.dto.MediaUploadResponse;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.storage.MediaUrlResolver;
import com.fitme.storage.StorageService;
import com.fitme.tryon.dto.TryOnAvatarDto;
import com.fitme.tryon.entity.TryOnAvatar;
import com.fitme.tryon.repository.TryOnAvatarRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TryOnAvatarService {

    private static final int MAX_LABEL_LENGTH = 80;
    private static final String UPLOAD_FOLDER = "tryon-avatars";

    private final TryOnAvatarRepository repository;
    private final MediaUrlResolver mediaUrlResolver;
    private final StorageService storageService;

    public List<TryOnAvatarDto> listActive() {
        return repository.findByActiveTrueOrderByDisplayOrderAscCreatedAtAsc().stream().map(this::toDto).toList();
    }

    public List<TryOnAvatarDto> listAll() {
        return repository.findAllByOrderByDisplayOrderAscCreatedAtAsc().stream().map(this::toDto).toList();
    }

    public boolean isSelectable(String avatarKey) {
        return avatarKey != null && repository.findByAvatarKey(avatarKey).map(TryOnAvatar::isActive).orElse(false);
    }

    /**
     * Public URL FASHN/ai-vton can download. A request keeps working if its avatar is hidden after
     * creation, so only existence is checked here.
     */
    public String resolveFetchableUrl(String avatarKey) {
        TryOnAvatar avatar = avatarKey == null ? null : repository.findByAvatarKey(avatarKey).orElse(null);
        if (avatar == null) {
            throw new BusinessException("Avatar mẫu không hợp lệ");
        }
        String imageUrl = avatar.getImageUrl();
        return imageUrl.startsWith("/catalog/")
                ? mediaUrlResolver.resolvePublicUrl(imageUrl)
                : mediaUrlResolver.resolveVtonFetchableUrl(imageUrl);
    }

    /** Browser-facing image for the illustration fallback; null when the avatar no longer exists. */
    public String findPreviewUrl(String avatarKey) {
        if (avatarKey == null) {
            return null;
        }
        return repository.findByAvatarKey(avatarKey)
                .map(avatar -> mediaUrlResolver.resolvePublicUrl(avatar.getImageUrl()))
                .orElse(null);
    }

    @Transactional
    public TryOnAvatarDto create(TryOnAvatarDto.Upsert request) {
        int nextOrder = repository.findAllByOrderByDisplayOrderAscCreatedAtAsc().stream()
                .mapToInt(TryOnAvatar::getDisplayOrder)
                .max()
                .orElse(0) + 1;
        TryOnAvatar avatar = TryOnAvatar.builder()
                .avatarKey("avatar-" + UUID.randomUUID().toString().substring(0, 8))
                .label(requireLabel(request.label()))
                .imageUrl(requireImageUrl(request.imageUrl()))
                .displayOrder(nextOrder)
                .active(request.active() == null || request.active())
                .build();
        return toDto(repository.save(avatar));
    }

    @Transactional
    public TryOnAvatarDto update(UUID id, TryOnAvatarDto.Upsert request) {
        TryOnAvatar avatar = require(id);
        String previousImage = avatar.getImageUrl();
        if (request.label() != null) {
            avatar.setLabel(requireLabel(request.label()));
        }
        if (request.imageUrl() != null) {
            avatar.setImageUrl(requireImageUrl(request.imageUrl()));
        }
        if (request.active() != null) {
            avatar.setActive(request.active());
        }
        TryOnAvatar saved = repository.saveAndFlush(avatar);
        if (!previousImage.equals(saved.getImageUrl())) {
            deleteUploadedImage(previousImage);
        }
        return toDto(saved);
    }

    @Transactional
    public void delete(UUID id) {
        TryOnAvatar avatar = require(id);
        repository.delete(avatar);
        repository.flush();
        deleteUploadedImage(avatar.getImageUrl());
    }

    /** Swaps the avatar with its neighbour; {@code up} moves it earlier in the picker. */
    @Transactional
    public List<TryOnAvatarDto> move(UUID id, boolean up) {
        List<TryOnAvatar> ordered = new ArrayList<>(repository.findAllByOrderByDisplayOrderAscCreatedAtAsc());
        int index = -1;
        for (int i = 0; i < ordered.size(); i++) {
            if (ordered.get(i).getId().equals(id)) {
                index = i;
                break;
            }
        }
        if (index < 0) {
            throw new NotFoundException("Không tìm thấy avatar mẫu");
        }
        int target = up ? index - 1 : index + 1;
        if (target >= 0 && target < ordered.size()) {
            ordered.add(target, ordered.remove(index));
        }
        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setDisplayOrder(i + 1);
        }
        repository.saveAllAndFlush(ordered);
        return ordered.stream().map(this::toDto).toList();
    }

    public MediaUploadResponse uploadImage(MultipartFile file) throws IOException {
        String path = storageService.store(UPLOAD_FOLDER, UUID.randomUUID() + "-" + file.getOriginalFilename(), file);
        return MediaUploadResponse.builder().url(path).build();
    }

    private TryOnAvatar require(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Không tìm thấy avatar mẫu"));
    }

    private static String requireLabel(String label) {
        String trimmed = label == null ? "" : label.trim();
        if (trimmed.isEmpty()) {
            throw new BusinessException("Tên avatar mẫu không được để trống");
        }
        if (trimmed.length() > MAX_LABEL_LENGTH) {
            throw new BusinessException("Tên avatar mẫu tối đa " + MAX_LABEL_LENGTH + " ký tự");
        }
        return trimmed;
    }

    private static String requireImageUrl(String imageUrl) {
        String trimmed = imageUrl == null ? "" : imageUrl.trim();
        if (trimmed.isEmpty()) {
            throw new BusinessException("Cần ảnh cho avatar mẫu");
        }
        boolean allowed = trimmed.startsWith("/uploads/") || trimmed.startsWith("/catalog/")
                || trimmed.startsWith("https://");
        if (!allowed || trimmed.contains("..")) {
            throw new BusinessException("Đường dẫn ảnh avatar mẫu không hợp lệ");
        }
        return trimmed;
    }

    private void deleteUploadedImage(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith("/uploads/" + UPLOAD_FOLDER + "/")) {
            return;
        }
        try {
            storageService.delete(imageUrl);
        } catch (IOException | RuntimeException e) {
            log.warn("[TRYON_AVATAR] could not delete old image {}: {}", imageUrl, e.getMessage());
        }
    }

    private TryOnAvatarDto toDto(TryOnAvatar avatar) {
        return new TryOnAvatarDto(avatar.getId(), avatar.getAvatarKey(), avatar.getLabel(), avatar.getImageUrl(),
                avatar.getDisplayOrder(), avatar.isActive());
    }
}
