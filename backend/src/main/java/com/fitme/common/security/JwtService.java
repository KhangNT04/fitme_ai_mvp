package com.fitme.common.security;

import com.fitme.auth.entity.RefreshTokenRevocation;
import com.fitme.auth.repository.RefreshTokenRevocationRepository;
import com.fitme.common.config.FitMeProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

@Service
public class JwtService {

    public static final String CLAIM_USER_ID = "userId";
    public static final String CLAIM_TOKEN_TYPE = "type";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";
    public static final String TYPE_PASSWORD_RESET = "password_reset";
    private static final String CLAIM_PASSWORD_FINGERPRINT = "pwd";

    private final FitMeProperties properties;
    private final SecretKey secretKey;
    private final RefreshTokenRevocationRepository revocationRepository;

    public JwtService(FitMeProperties properties, RefreshTokenRevocationRepository revocationRepository) {
        this.properties = properties;
        this.secretKey = Keys.hmacShaKeyFor(properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
        this.revocationRepository = revocationRepository;
    }

    public String generateAccessToken(UUID userId, String email, String role) {
        return buildToken(userId, email, role, TYPE_ACCESS, properties.getJwt().getAccessExpiration());
    }

    public String generateRefreshToken(UUID userId, String email, String role) {
        return buildToken(userId, email, role, TYPE_REFRESH, properties.getJwt().getRefreshExpiration());
    }

    private String buildToken(UUID userId, String email, String role, String type, long expirationMs) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(email)
                .claims(Map.of(
                        CLAIM_USER_ID, userId.toString(),
                        CLAIM_TOKEN_TYPE, type,
                        "role", role
                ))
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isAccessToken(String token) {
        return TYPE_ACCESS.equals(parseClaims(token).get(CLAIM_TOKEN_TYPE, String.class));
    }

    public boolean isRefreshToken(String token) {
        return TYPE_REFRESH.equals(parseClaims(token).get(CLAIM_TOKEN_TYPE, String.class));
    }

    public UUID getUserId(String token) {
        return UUID.fromString(parseClaims(token).get(CLAIM_USER_ID, String.class));
    }

    public String getEmail(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * True when the token predates the account's last password change. JWT {@code iat} has second precision,
     * so the change instant is truncated to seconds: tokens issued in the same second as the change stay valid.
     */
    public boolean issuedBeforePasswordChange(String token, Instant passwordChangedAt) {
        if (passwordChangedAt == null) {
            return false;
        }
        Date issuedAt = parseClaims(token).getIssuedAt();
        return issuedAt == null || issuedAt.toInstant().isBefore(passwordChangedAt.truncatedTo(ChronoUnit.SECONDS));
    }

    public void revokeRefreshToken(String token) {
        revocationRepository.save(RefreshTokenRevocation.builder()
                .tokenHash(hashToken(token))
                .revokedAt(Instant.now())
                .build());
    }

    public boolean isRefreshTokenRevoked(String token) {
        return revocationRepository.existsById(hashToken(token));
    }

    /**
     * Stateless reset token: survives restarts, and stops working once the password changes because it
     * embeds a fingerprint of the password hash it was issued against.
     */
    public String generatePasswordResetToken(UUID userId, String email, String passwordHash, long ttlMs) {
        Date now = new Date();
        return Jwts.builder()
                .subject(email)
                .claims(Map.of(
                        CLAIM_USER_ID, userId.toString(),
                        CLAIM_TOKEN_TYPE, TYPE_PASSWORD_RESET,
                        CLAIM_PASSWORD_FINGERPRINT, passwordFingerprint(passwordHash)
                ))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttlMs))
                .signWith(secretKey)
                .compact();
    }

    /** User id of a valid, unexpired reset token whose fingerprint still matches {@code currentPasswordHash}. */
    public Optional<UUID> resolvePasswordResetUser(String token, Function<UUID, String> currentPasswordHash) {
        Claims claims;
        try {
            claims = parseClaims(token);
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
        if (!TYPE_PASSWORD_RESET.equals(claims.get(CLAIM_TOKEN_TYPE, String.class))) {
            return Optional.empty();
        }
        UUID userId;
        try {
            userId = UUID.fromString(claims.get(CLAIM_USER_ID, String.class));
        } catch (IllegalArgumentException | NullPointerException ex) {
            return Optional.empty();
        }
        String expected = claims.get(CLAIM_PASSWORD_FINGERPRINT, String.class);
        String current = currentPasswordHash.apply(userId);
        if (expected == null || current == null || !expected.equals(passwordFingerprint(current))) {
            return Optional.empty();
        }
        return Optional.of(userId);
    }

    private static String passwordFingerprint(String passwordHash) {
        return hashToken(passwordHash == null ? "" : passwordHash).substring(0, 16);
    }

    private static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
