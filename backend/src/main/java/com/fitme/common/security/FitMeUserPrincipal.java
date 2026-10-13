package com.fitme.common.security;

import com.fitme.auth.entity.UserAccount;
import com.fitme.common.enums.UserRole;
import com.fitme.common.enums.UserStatus;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Getter
public class FitMeUserPrincipal implements UserDetails {

    private final UUID userId;
    private final String email;
    private final String passwordHash;
    private final UserRole role;
    private final boolean active;
    private final Instant passwordChangedAt;
    private final boolean totpEnabled;
    /** True when the bearer token of this request was issued after a TOTP check and 2FA is still on. */
    private final boolean mfaVerified;

    public FitMeUserPrincipal(UserAccount user) {
        this.userId = user.getId();
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.role = user.getRole();
        this.active = user.getStatus() == UserStatus.ACTIVE;
        this.passwordChangedAt = user.getPasswordChangedAt();
        this.totpEnabled = user.isTotpEnabled();
        this.mfaVerified = false;
    }

    private FitMeUserPrincipal(FitMeUserPrincipal source, boolean mfaVerified) {
        this.userId = source.userId;
        this.email = source.email;
        this.passwordHash = source.passwordHash;
        this.role = source.role;
        this.active = source.active;
        this.passwordChangedAt = source.passwordChangedAt;
        this.totpEnabled = source.totpEnabled;
        this.mfaVerified = mfaVerified;
    }

    /** Applies the token's {@code mfa} claim; it stops counting once 2FA is turned off for the account. */
    public FitMeUserPrincipal withMfaVerified(boolean tokenClaim) {
        boolean verified = tokenClaim && totpEnabled;
        return verified == mfaVerified ? this : new FitMeUserPrincipal(this, verified);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
