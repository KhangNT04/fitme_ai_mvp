package com.fitme.auth.repository;

import com.fitme.auth.entity.RefreshTokenRevocation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRevocationRepository extends JpaRepository<RefreshTokenRevocation, String> {
}
