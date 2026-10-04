package com.fitme.tryon.repository;

import com.fitme.tryon.entity.TryOnAvatar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TryOnAvatarRepository extends JpaRepository<TryOnAvatar, UUID> {

    List<TryOnAvatar> findAllByOrderByDisplayOrderAscCreatedAtAsc();

    List<TryOnAvatar> findByActiveTrueOrderByDisplayOrderAscCreatedAtAsc();

    Optional<TryOnAvatar> findByAvatarKey(String avatarKey);
}
