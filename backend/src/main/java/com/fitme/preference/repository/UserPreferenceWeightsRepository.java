package com.fitme.preference.repository;

import com.fitme.preference.entity.UserPreferenceWeights;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserPreferenceWeightsRepository extends JpaRepository<UserPreferenceWeights, UUID> {

    Optional<UserPreferenceWeights> findFirstByUserIdOrderByUpdatedAtDesc(UUID userId);

    Optional<UserPreferenceWeights> findFirstBySessionIdOrderByUpdatedAtDesc(UUID sessionId);
}
