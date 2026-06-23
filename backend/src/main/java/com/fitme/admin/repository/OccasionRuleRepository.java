package com.fitme.admin.repository;

import com.fitme.admin.entity.OccasionRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OccasionRuleRepository extends JpaRepository<OccasionRule, UUID> {

    Optional<OccasionRule> findByName(String name);

    List<OccasionRule> findByActiveTrue();
}
