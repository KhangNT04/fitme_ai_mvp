package com.fitme.cart.repository;

import com.fitme.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {

    List<CartItem> findByCartId(UUID cartId);

    Optional<CartItem> findByCartIdAndVariantId(UUID cartId, UUID variantId);

    Optional<CartItem> findByIdAndCartId(UUID id, UUID cartId);

    @Modifying
    @Query("delete from CartItem i where i.cartId = :cartId")
    int deleteByCartId(@Param("cartId") UUID cartId);
}
