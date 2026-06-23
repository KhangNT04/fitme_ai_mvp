package com.fitme.userprofile.repository;

import com.fitme.userprofile.entity.StyleProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StyleProfileRepository extends JpaRepository<StyleProfile, UUID> {

    Optional<StyleProfile> findFirstByUserIdOrderByUpdatedAtDesc(UUID userId);

    Optional<StyleProfile> findFirstBySessionIdOrderByUpdatedAtDesc(UUID sessionId);

    List<StyleProfile> findByUserId(UUID userId);

    List<StyleProfile> findBySessionId(UUID sessionId);
}
