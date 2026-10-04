package com.fitme.fitken.repository;

import com.fitme.fitken.entity.FitkenWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FitkenWalletRepository extends JpaRepository<FitkenWallet, UUID> {

    @Modifying
    @Query(value = "INSERT INTO fitken_wallets (user_id) VALUES (:userId) ON CONFLICT (user_id) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(@Param("userId") UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from FitkenWallet w where w.userId = :userId")
    Optional<FitkenWallet> findByIdForUpdate(@Param("userId") UUID userId);
}
