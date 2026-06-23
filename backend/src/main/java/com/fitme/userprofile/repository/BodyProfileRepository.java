package com.fitme.userprofile.repository;

import com.fitme.userprofile.entity.BodyProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BodyProfileRepository extends JpaRepository<BodyProfile, UUID> {

    Optional<BodyProfile> findFirstByUserIdOrderByUpdatedAtDesc(UUID userId);

    Optional<BodyProfile> findFirstBySessionIdOrderByUpdatedAtDesc(UUID sessionId);

    List<BodyProfile> findByUserId(UUID userId);

    List<BodyProfile> findBySessionId(UUID sessionId);
}
