package com.fitme.privacy.service;

import com.fitme.gallery.service.GalleryService;
import com.fitme.storage.StorageService;
import com.fitme.storage.StoredMediaPaths;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Erases personal data for a user and/or anonymous session. Billing orders and wallet ledgers are
 * kept for accounting; "ALL" anonymises the account instead of deleting the row they reference.
 */
@Service
@RequiredArgsConstructor
public class UserDataEraser {

    private static final Logger log = LoggerFactory.getLogger(UserDataEraser.class);
    private static final List<String> OWNED_MEDIA_PREFIXES = List.of(
            "/uploads/user-photos/", "/uploads/wardrobe/", "/uploads/reviews/", "/uploads/vton-results/");

    /** Rows owned by the user, the requesting session, or sessions later linked to the user. */
    private static final String OWNER =
            "(user_id = :u OR session_id = :s OR session_id IN (SELECT id FROM anonymous_sessions WHERE linked_user_id = :u))";
    private static final String UPLOADS = "SELECT id FROM user_photo_uploads WHERE " + OWNER;
    private static final String TRY_ONS = "SELECT id FROM try_on_requests WHERE " + OWNER;
    private static final String RECOMMENDATIONS = "SELECT id FROM recommendations WHERE " + OWNER;
    private static final String PREVIEWS = "SELECT id FROM preview_generations WHERE photo_upload_id IN (" + UPLOADS
            + ") OR try_on_request_id IN (" + TRY_ONS + ")";

    private final NamedParameterJdbcTemplate jdbc;
    private final GalleryService galleryService;
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void eraseBodyProfile(UUID userId, UUID sessionId) {
        jdbc.update("DELETE FROM body_profiles WHERE " + OWNER, owner(userId, sessionId));
    }

    @Transactional
    public void eraseStyleProfile(UUID userId, UUID sessionId) {
        jdbc.update("DELETE FROM style_profiles WHERE " + OWNER, owner(userId, sessionId));
        jdbc.update("DELETE FROM user_preference_weights WHERE " + OWNER, owner(userId, sessionId));
    }

    @Transactional
    public void eraseWardrobe(UUID userId, UUID sessionId) {
        MapSqlParameterSource p = owner(userId, sessionId);
        List<String> files = jdbc.queryForList("SELECT image_url FROM wardrobe_items WHERE " + OWNER, p, String.class);
        jdbc.update("UPDATE recommendation_items SET wardrobe_item_id = NULL WHERE wardrobe_item_id IN "
                + "(SELECT id FROM wardrobe_items WHERE " + OWNER + ")", p);
        jdbc.update("DELETE FROM wardrobe_items WHERE " + OWNER, p);
        deleteFilesAfterCommit(files);
    }

    @Transactional
    public void erasePhotos(UUID userId, UUID sessionId) {
        MapSqlParameterSource p = owner(userId, sessionId);
        if (userId != null) {
            galleryService.purgeForUser(userId);
        }
        List<String> files = new ArrayList<>();
        files.addAll(jdbc.queryForList("SELECT file_url FROM user_photo_uploads WHERE " + OWNER, p, String.class));
        files.addAll(jdbc.queryForList("SELECT preview_image_url FROM preview_generations WHERE id IN (" + PREVIEWS + ")",
                p, String.class));
        jdbc.update("UPDATE try_on_requests SET preview_generation_id = NULL WHERE preview_generation_id IN (" + PREVIEWS + ")", p);
        jdbc.update("DELETE FROM preview_generations WHERE id IN (" + PREVIEWS + ")", p);
        jdbc.update("UPDATE try_on_requests SET photo_upload_id = NULL WHERE photo_upload_id IN (" + UPLOADS + ")", p);
        jdbc.update("DELETE FROM user_photo_uploads WHERE " + OWNER, p);
        deleteFilesAfterCommit(files);
    }

    @Transactional
    public void eraseRecommendationHistory(UUID userId, UUID sessionId) {
        MapSqlParameterSource p = owner(userId, sessionId);
        for (String table : List.of("analytics_events", "buy_click_events", "feedbacks", "preview_generations")) {
            jdbc.update("UPDATE " + table + " SET recommendation_id = NULL WHERE recommendation_id IN (" + RECOMMENDATIONS + ")", p);
        }
        jdbc.update("DELETE FROM recommendations WHERE " + OWNER, p);
        jdbc.update("UPDATE recommendations SET outfit_request_id = NULL WHERE outfit_request_id IN "
                + "(SELECT id FROM outfit_requests WHERE " + OWNER + ")", p);
        jdbc.update("DELETE FROM outfit_requests WHERE " + OWNER, p);
        if (userId != null) {
            jdbc.update("DELETE FROM stylist_conversations WHERE user_id = :u", p);
        }
    }

    /** Everything personal; the account row itself is anonymised and can no longer sign in. */
    @Transactional
    public void eraseAll(UUID userId, UUID sessionId) {
        MapSqlParameterSource p = owner(userId, sessionId);
        erasePhotos(userId, sessionId);
        eraseRecommendationHistory(userId, sessionId);
        eraseWardrobe(userId, sessionId);
        eraseBodyProfile(userId, sessionId);
        eraseStyleProfile(userId, sessionId);

        for (String table : List.of("analytics_events", "buy_click_events", "feedbacks")) {
            jdbc.update("UPDATE " + table + " SET try_on_request_id = NULL WHERE try_on_request_id IN (" + TRY_ONS + ")", p);
        }
        jdbc.update("DELETE FROM try_on_requests WHERE " + OWNER, p);
        jdbc.update("DELETE FROM feedbacks WHERE " + OWNER, p);
        if (userId == null) {
            return;
        }

        List<String> reviewFiles = jdbc.queryForList("SELECT i.image_url FROM product_review_images i "
                + "JOIN product_reviews r ON r.id = i.review_id WHERE r.user_id = :u", p, String.class);
        jdbc.update("DELETE FROM product_reviews WHERE user_id = :u", p);
        for (String table : List.of("analytics_events", "buy_click_events", "site_visits")) {
            jdbc.update("UPDATE " + table + " SET user_id = NULL WHERE user_id = :u", p);
        }
        p.addValue("hash", passwordEncoder.encode(UUID.randomUUID().toString()));
        jdbc.update("""
                UPDATE user_accounts SET
                    email = 'deleted-' || id || '@deleted.fitme.invalid',
                    display_name = NULL,
                    password_hash = :hash,
                    status = 'DELETED',
                    email_verification_code = NULL,
                    email_verification_expires_at = NULL,
                    signup_source = NULL, signup_medium = NULL, signup_campaign = NULL, signup_referrer = NULL,
                    password_changed_at = NOW(),
                    updated_at = NOW()
                WHERE id = :u
                """, p);
        deleteFilesAfterCommit(reviewFiles);
    }

    private static MapSqlParameterSource owner(UUID userId, UUID sessionId) {
        return new MapSqlParameterSource()
                .addValue("u", userId, Types.OTHER)
                .addValue("s", sessionId, Types.OTHER);
    }

    private void deleteFilesAfterCommit(List<String> storedPaths) {
        List<String> owned = storedPaths.stream()
                .map(StoredMediaPaths::normalizeToUploadPath)
                .filter(path -> path != null && OWNED_MEDIA_PREFIXES.stream().anyMatch(path::startsWith))
                .distinct()
                .toList();
        if (owned.isEmpty()) return;
        Runnable delete = () -> owned.forEach(path -> {
            try {
                storageService.delete(path);
            } catch (Exception ex) {
                log.warn("[PRIVACY] Could not delete media {}: {}", path, ex.getMessage());
            }
        });
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    delete.run();
                }
            });
        } else {
            delete.run();
        }
    }
}
