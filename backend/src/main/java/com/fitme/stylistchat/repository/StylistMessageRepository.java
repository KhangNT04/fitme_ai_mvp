package com.fitme.stylistchat.repository;

import com.fitme.stylistchat.entity.StylistMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StylistMessageRepository extends JpaRepository<StylistMessage, UUID> {

    List<StylistMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);
}
