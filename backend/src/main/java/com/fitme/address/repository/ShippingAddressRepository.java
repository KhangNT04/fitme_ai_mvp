package com.fitme.address.repository;

import com.fitme.address.entity.ShippingAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShippingAddressRepository extends JpaRepository<ShippingAddress, UUID> {

    List<ShippingAddress> findByUserIdOrderByDefaultAddressDescCreatedAtDesc(UUID userId);

    Optional<ShippingAddress> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserId(UUID userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update ShippingAddress a set a.defaultAddress = false where a.userId = :userId and a.defaultAddress = true")
    int clearDefault(@Param("userId") UUID userId);
}
