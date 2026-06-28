package com.fitme.common.security;

import com.fitme.auth.entity.RefreshTokenRevocation;
import com.fitme.auth.repository.RefreshTokenRevocationRepository;
import com.fitme.common.config.FitMeProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    public static final String CLAIM_USER_ID = "userId";
    public static final String CLAIM_TOKEN_TYPE = "type";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

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

    public void revokeRefreshToken(String token) {
        revocationRepository.save(RefreshTokenRevocation.builder()
                .tokenHash(hashToken(token))
                .revokedAt(Instant.now())
                .build());
    }

    public boolean isRefreshTokenRevoked(String token) {
        return revocationRepository.existsById(hashToken(token));
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
