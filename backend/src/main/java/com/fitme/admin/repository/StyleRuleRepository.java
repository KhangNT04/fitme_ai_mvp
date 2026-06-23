package com.fitme.admin.repository;

import com.fitme.admin.entity.StyleRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StyleRuleRepository extends JpaRepository<StyleRule, UUID> {

    Optional<StyleRule> findByName(String name);

    List<StyleRule> findByActiveTrue();
}
