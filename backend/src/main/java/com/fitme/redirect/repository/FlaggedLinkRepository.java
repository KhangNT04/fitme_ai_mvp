package com.fitme.redirect.repository;

import com.fitme.common.enums.FlaggedLinkStatus;
import com.fitme.redirect.entity.FlaggedLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FlaggedLinkRepository extends JpaRepository<FlaggedLink, UUID> {

    List<FlaggedLink> findByProductId(UUID productId);

    List<FlaggedLink> findByStatus(FlaggedLinkStatus status);
}
