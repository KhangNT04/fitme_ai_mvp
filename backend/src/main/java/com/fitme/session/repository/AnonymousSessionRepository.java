package com.fitme.session.repository;

import com.fitme.session.entity.AnonymousSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnonymousSessionRepository extends JpaRepository<AnonymousSession, UUID> {

    Optional<AnonymousSession> findBySessionToken(String sessionToken);

    List<AnonymousSession> findByLinkedUserId(UUID linkedUserId);

    List<AnonymousSession> findByExpiresAtBefore(Instant expiresAt);
}
