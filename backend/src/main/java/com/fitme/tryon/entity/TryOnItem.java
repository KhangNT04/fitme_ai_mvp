package com.fitme.tryon.entity;

import com.fitme.common.enums.ItemRole;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "try_on_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TryOnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "try_on_request_id", nullable = false)
    private UUID tryOnRequestId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemRole role;

    @Column(name = "selected_size")
    private String selectedSize;

    @Column(name = "selected_color")
    private String selectedColor;
}
