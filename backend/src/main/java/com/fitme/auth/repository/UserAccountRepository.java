package com.fitme.auth.repository;

import com.fitme.auth.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByEmail(String email);

    /** Looks an account up by its public community author key. */
    Optional<UserAccount> findByCommunityAuthorKey(UUID communityAuthorKey);

    boolean existsByEmail(String email);
}
