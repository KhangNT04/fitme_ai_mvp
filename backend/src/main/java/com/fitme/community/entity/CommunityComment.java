package com.fitme.community.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A comment on a community post. {@code parentId} makes a single level of replies, like a typical
 * social feed: replying to a reply attaches to the top-level comment instead of nesting deeper.
 */
@Entity
@Table(name = "community_comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityComment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** The comment this one replies to. Null for a top-level comment. */
    @Column(name = "parent_id")
    private UUID parentId;

    /**
     * Snapshot of the parent's author, kept so a reply still shows who it answered after the
     * parent comment is deleted.
     */
    @Column(name = "parent_author_id")
    private UUID parentAuthorId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, updatable = false)
    private Instant updatedAt;
}
