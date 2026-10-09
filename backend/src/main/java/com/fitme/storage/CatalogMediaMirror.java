package com.fitme.storage;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "catalog_media_mirror")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CatalogMediaMirror {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "source_url", nullable = false, unique = true, columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(name = "stored_path", nullable = false, columnDefinition = "TEXT")
    private String storedPath;

    @Column(name = "public_url", columnDefinition = "TEXT")
    private String publicUrl;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** The URL product images and brand logos should reference. */
    public String servedUrl() {
        return publicUrl != null && !publicUrl.isBlank() ? publicUrl : storedPath;
    }
}
