package com.fitme.redirect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "buy_click_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyClickEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "recommendation_id")
    private UUID recommendationId;

    @Column(name = "try_on_request_id")
    private UUID tryOnRequestId;

    @Column(name = "selected_size")
    private String selectedSize;

    @Column(name = "selected_color")
    private String selectedColor;

    @Column(name = "source_page")
    private String sourcePage;

    @Column(name = "purchase_url", nullable = false, columnDefinition = "TEXT")
    private String purchaseUrl;

    private String channel;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
