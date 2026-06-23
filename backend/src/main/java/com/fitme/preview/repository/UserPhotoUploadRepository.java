package com.fitme.preview.repository;

import com.fitme.preview.entity.UserPhotoUpload;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserPhotoUploadRepository extends JpaRepository<UserPhotoUpload, UUID> {

    List<UserPhotoUpload> findByUserId(UUID userId);

    List<UserPhotoUpload> findBySessionId(UUID sessionId);

    List<UserPhotoUpload> findByUserIdAndStatus(UUID userId, String status);

    List<UserPhotoUpload> findBySessionIdAndStatus(UUID sessionId, String status);
}
