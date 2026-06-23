package com.fitme.admin.service;

import com.fitme.admin.dto.OccasionRuleRequest;
import com.fitme.admin.dto.StyleRuleRequest;
import com.fitme.admin.entity.OccasionRule;
import com.fitme.admin.entity.StyleRule;
import com.fitme.admin.repository.OccasionRuleRepository;
import com.fitme.admin.repository.StyleRuleRepository;
import com.fitme.common.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminRuleService {

    private final StyleRuleRepository styleRuleRepository;
    private final OccasionRuleRepository occasionRuleRepository;

    public List<StyleRule> listStyleRules() {
        return styleRuleRepository.findAll();
    }

    @Transactional
    public StyleRule createStyleRule(StyleRuleRequest request) {
        return styleRuleRepository.save(StyleRule.builder()
                .name(request.getName())
                .description(request.getDescription())
                .keywords(request.getKeywords())
                .active(request.getActive() == null || request.getActive())
                .build());
    }

    @Transactional
    public StyleRule updateStyleRule(UUID id, StyleRuleRequest request) {
        StyleRule rule = styleRuleRepository.findById(id).orElseThrow(() -> new NotFoundException("Rule không tồn tại"));
        rule.setName(request.getName());
        rule.setDescription(request.getDescription());
        rule.setKeywords(request.getKeywords());
        if (request.getActive() != null) rule.setActive(request.getActive());
        return styleRuleRepository.save(rule);
    }

    @Transactional
    public void deleteStyleRule(UUID id) {
        styleRuleRepository.deleteById(id);
    }

    public List<OccasionRule> listOccasionRules() {
        return occasionRuleRepository.findAll();
    }

    @Transactional
    public OccasionRule createOccasionRule(OccasionRuleRequest request) {
        return occasionRuleRepository.save(OccasionRule.builder()
                .name(request.getName())
                .description(request.getDescription())
                .keywords(request.getKeywords())
                .active(request.getActive() == null || request.getActive())
                .build());
    }

    @Transactional
    public OccasionRule updateOccasionRule(UUID id, OccasionRuleRequest request) {
        OccasionRule rule = occasionRuleRepository.findById(id).orElseThrow(() -> new NotFoundException("Rule không tồn tại"));
        rule.setName(request.getName());
        rule.setDescription(request.getDescription());
        rule.setKeywords(request.getKeywords());
        if (request.getActive() != null) rule.setActive(request.getActive());
        return occasionRuleRepository.save(rule);
    }

    @Transactional
    public void deleteOccasionRule(UUID id) {
        occasionRuleRepository.deleteById(id);
    }
}
