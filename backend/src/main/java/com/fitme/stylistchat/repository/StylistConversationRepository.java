package com.fitme.stylistchat.repository;

import com.fitme.stylistchat.entity.StylistConversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StylistConversationRepository extends JpaRepository<StylistConversation, UUID> {

    List<StylistConversation> findByUserIdOrderByUpdatedAtDesc(UUID userId);

    Optional<StylistConversation> findFirstByUserIdOrderByUpdatedAtDesc(UUID userId);
}
